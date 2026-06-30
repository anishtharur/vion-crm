import { AppShell } from "@/components/layout/app-shell";
import { getSettings } from "@/lib/data/settings";

// This subtree always reads live data from SQLite.
export const dynamic = "force-dynamic";

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = getSettings();
  return <AppShell companyName={settings.companyName}>{children}</AppShell>;
}
