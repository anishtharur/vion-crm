import { SettingsForm } from "@/components/forms/settings-form";
import { PageHeader } from "@/components/ui/page-header";
import { getSettings } from "@/lib/data/settings";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const settings = getSettings();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Settings" description="Your company details and document defaults." />
      <SettingsForm settings={settings} />
    </div>
  );
}
