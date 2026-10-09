import { requireSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Print pages show full document data; gate them like the main app.
  await requireSession();
  return (
    <div className="min-h-dvh bg-white print:bg-white">
      {/* The server-side PDF (Puppeteer) supplies page margins + running
          header/footer, so the document itself carries no print padding. */}
      <div className="mx-auto max-w-3xl px-4 pb-16 print:max-w-none print:p-0">
        {children}
      </div>
    </div>
  );
}
