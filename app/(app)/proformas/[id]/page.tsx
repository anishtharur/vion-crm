import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRightLeft, Download, Pencil } from "lucide-react";

import { ActionButton } from "@/components/documents/action-button";
import { DocumentPaper } from "@/components/documents/document-paper";
import { StatusControl } from "@/components/documents/status-control";
import { DeleteButton } from "@/components/forms/delete-button";
import { buttonClass } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import {
  convertProformaToInvoice,
  deleteProforma,
  setProformaStatus,
} from "@/lib/actions/proformas";
import { getProforma } from "@/lib/data/proformas";
import { getSettings } from "@/lib/data/settings";
import { PROFORMA_STATUSES } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function ProformaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const found = getProforma(Number(id));
  if (!found) notFound();

  const { proforma, client, items } = found;
  const settings = getSettings();

  return (
    <div className="space-y-6">
      <PageHeader
        title={proforma.number}
        description={`Pro-forma for ${client.name}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusControl
              current={proforma.status}
              statuses={PROFORMA_STATUSES}
              action={setProformaStatus.bind(null, proforma.id)}
            />
            <Link href={`/proformas/${proforma.id}/edit`} className={buttonClass("outline", "md")}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
            <a
              href={`/print/proformas/${proforma.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass("outline", "md")}
            >
              <Download className="h-4 w-4" />
              PDF
            </a>
            <ActionButton
              action={convertProformaToInvoice.bind(null, proforma.id)}
              label="To invoice"
              pendingLabel="Converting…"
              icon={<ArrowRightLeft className="h-4 w-4" />}
              variant="accent"
              confirm="Create an invoice from this pro-forma?"
            />
            <DeleteButton
              action={deleteProforma.bind(null, proforma.id)}
              confirm={`Delete ${proforma.number}? This cannot be undone.`}
            />
          </div>
        }
      />

      <DocumentPaper
        settings={settings}
        client={client}
        items={items}
        data={{
          docType: "proforma",
          number: proforma.number,
          status: proforma.status,
          issueDate: proforma.issueDate,
          secondaryLabel: "Valid until",
          secondaryDate: proforma.validUntil,
          subject: proforma.subject,
          projectName: proforma.projectName,
          enquiryRef: proforma.enquiryRef,
          attention: proforma.attention,
          notes: proforma.notes,
          terms: proforma.terms,
          subtotal: proforma.subtotal,
          discount: proforma.discount,
          taxRate: proforma.taxRate,
          taxAmount: proforma.taxAmount,
          total: proforma.total,
        }}
      />
    </div>
  );
}
