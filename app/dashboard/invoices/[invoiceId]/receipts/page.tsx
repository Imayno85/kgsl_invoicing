// app/dashboard/invoices/[invoiceId]/receipts/create/page.tsx
import { ReceiptsForm } from "@/app/components/ReceiptsForm";

export default function CreateReceiptForInvoicePage({
  params,
}: {
  params: { invoiceId: string };
}) {
  return <ReceiptsForm invoiceId={params.invoiceId} />;
}