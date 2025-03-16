// app/dashboard/invoices/[invoiceId]/receipts/create/page.tsx
"use client";

import { ReceiptsForm } from "@/app/components/ReceiptsForm";
import { use } from "react";

export default function CreateReceiptForInvoicePage({
  params,
}: {
  params: { invoiceId: string };
}) {
  const invoiceId = (use(params as any) as { invoiceId: string }).invoiceId;

  return <ReceiptsForm invoiceId={invoiceId} />;
}