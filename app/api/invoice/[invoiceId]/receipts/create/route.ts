// api/invoice/[invoiceId]/receipts/create/route.ts
import { NextResponse } from "next/server";


export async function GET(
  request: Request,
  { params }: { params: { invoiceId: string } }
) {
  const { invoiceId } = params;

 
  return NextResponse.redirect(`/dashboard/invoices/${invoiceId}/receipts/create`);
}