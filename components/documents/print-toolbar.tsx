"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { useEffect } from "react";

import { buttonClass } from "@/components/ui/button";

/**
 * Sticky toolbar shown on the print page (hidden when printing). Offers an
 * explicit "Save as PDF" action and auto-opens the print dialog on load so the
 * "PDF" button in the app feels like a one-click download.
 */
export function PrintToolbar({ backHref }: { backHref: string }) {
  useEffect(() => {
    // Skip the auto print dialog when the page is being rendered to PDF server-side.
    if (new URLSearchParams(window.location.search).get("pdf") === "1") return;
    // Defer so fonts/layout settle before the print dialog opens.
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="no-print sticky top-0 z-10 mb-6 flex items-center justify-between gap-3 border-b border-border bg-surface/80 px-4 py-3 backdrop-blur">
      <Link href={backHref} className={buttonClass("ghost", "sm")}>
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>
      <button type="button" onClick={() => window.print()} className={buttonClass("primary", "sm")}>
        <Printer className="h-4 w-4" />
        Save as PDF
      </button>
    </div>
  );
}
