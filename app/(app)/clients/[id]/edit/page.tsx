import { notFound } from "next/navigation";

import { ClientForm } from "@/components/forms/client-form";
import { PageHeader } from "@/components/ui/page-header";
import { updateClient } from "@/lib/actions/clients";
import { getClient } from "@/lib/data/clients";

export const dynamic = "force-dynamic";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = getClient(Number(id));
  if (!client) notFound();

  const action = updateClient.bind(null, client.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={`Edit ${client.name}`} description="Update client details." />
      <ClientForm action={action} client={client} cancelHref={`/clients/${client.id}`} />
    </div>
  );
}
