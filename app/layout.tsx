import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

// Single enterprise UI typeface — neutral, dense, used for both body and headings.
const plex = IBM_Plex_Sans({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Vion CRM",
    template: "%s · Vion CRM",
  },
  description:
    "Vion Labs CRM — manage clients, quotations, order acknowledgements, pro-forma invoices, invoices and payment receipts in one place.",
  applicationName: "Vion CRM",
};

/**
 * Sets the `.dark` class before first paint to avoid a flash of the wrong theme.
 * Honours a saved choice, otherwise follows the OS preference.
 */
const themeScript = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plex.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
