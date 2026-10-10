import { AppShell } from "@/components/layout/app-shell";
import { requireSession } from "@/lib/auth/session";
import { getSettings } from "@/lib/data/settings";

// This subtree always reads live data from the database.
export const dynamic = "force-dynamic";

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Backstop for the proxy.ts gate — the real redirect usually happens there.
  const session = await requireSession();
  const settings = await getSettings();
  return (
    <AppShell
      companyName={settings.companyName}
      email={settings.email}
      userName={session.name}
      userEmail={session.email}
    >
      {children}
    </AppShell>
  );
}
