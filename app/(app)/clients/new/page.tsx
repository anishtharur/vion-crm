import { ClientForm } from "@/components/forms/client-form";
import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/lib/actions/clients";

export const dynamic = "force-dynamic";

export default function NewClientPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="New client" description="Add a person or company to your CRM." />
      <ClientForm action={createClient} cancelHref="/clients" />
    </div>
  );
}
