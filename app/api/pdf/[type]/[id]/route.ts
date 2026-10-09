import "server-only";

import type { Browser } from "puppeteer";
import puppeteer from "puppeteer";

import { getSession } from "@/lib/auth/session";
import { getSettings } from "@/lib/data/settings";

// Puppeteer needs the Node.js runtime; the PDF is generated per request.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Document types → their /print route segment. */
const PRINT_SEGMENT: Record<string, string> = {
  quotes: "quotes",
  orders: "orders",
  proformas: "proformas",
  invoices: "invoices",
  receipts: "receipts",
};

function esc(value: string): string {
  return String(value ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!,
  );
}

/** Reuse one headless browser across requests on the long-lived server. */
const globalForPdf = globalThis as unknown as { __pdfBrowser?: Browser };

async function getBrowser(): Promise<Browser> {
  if (!globalForPdf.__pdfBrowser || !globalForPdf.__pdfBrowser.connected) {
    globalForPdf.__pdfBrowser = await puppeteer.launch({
      headless: true,
      // On hosts where Puppeteer can't download Chromium (e.g. Linux ARM VMs),
      // point PUPPETEER_EXECUTABLE_PATH at a system-installed browser.
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  return globalForPdf.__pdfBrowser;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string; id: string }> },
) {
  // Backstop for the proxy.ts gate (route handlers must verify auth themselves).
  if (!(await getSession())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { type, id } = await params;
  const segment = PRINT_SEGMENT[type];
  if (!segment || !/^\d+$/.test(id)) {
    return new Response("Not found", { status: 404 });
  }

  const url = new URL(request.url);
  // Where Puppeteer fetches the printable page. Override with PDF_BASE_URL if the
  // public origin isn't reachable from the server (e.g. behind a proxy).
  const base = process.env.PDF_BASE_URL ?? url.origin;
  const printUrl = `${base}/print/${segment}/${id}?pdf=1`;

  const nameParam = url.searchParams.get("name");
  const filename = `${(nameParam || `${type}-${id}`).replace(/[^a-zA-Z0-9._-]/g, "-")}.pdf`;

  const settings = getSettings();

  // Running header/footer repeated on every page. `pageNumber`/`totalPages`
  // spans are filled in by Chromium.
  const headerTemplate = `
    <div style="width:100%;font-family:Arial,Helvetica,sans-serif;font-size:8px;color:#06312e;padding:0 12mm;display:flex;justify-content:space-between;align-items:center;-webkit-print-color-adjust:exact;">
      <span style="font-weight:700;letter-spacing:1px;">${esc(settings.companyName.toUpperCase())}</span>
      <span style="color:#6b7280;letter-spacing:1px;">${esc(settings.tagline || "")}</span>
    </div>`;
  const footerTemplate = `
    <div style="width:100%;font-family:Arial,Helvetica,sans-serif;font-size:8px;color:#6b7280;padding:0 12mm;display:flex;justify-content:space-between;align-items:center;">
      <span>${esc(settings.footerNote || settings.companyName)}</span>
      <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
    </div>`;

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    // The /print pages sit behind the auth gate too — forward this request's
    // session cookie so Puppeteer's fetch isn't bounced to /login.
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      await page.setExtraHTTPHeaders({ cookie: cookieHeader });
    }
    await page.goto(printUrl, { waitUntil: "networkidle0", timeout: 60_000 });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate,
      footerTemplate,
      preferCSSPageSize: false,
      margin: { top: "22mm", bottom: "16mm", left: "12mm", right: "12mm" },
    });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } finally {
    await page.close();
  }
}
