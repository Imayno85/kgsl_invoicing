import prisma from "@/app/utils/db";
import { NextResponse } from "next/server";
import { requireUser } from "@/app/utils/hooks";

export async function GET(
  request: Request,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const session = await requireUser();
    const { invoiceId } = await params;

    if (!invoiceId) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 }
      );
    }

    const data = await prisma.invoice.findUnique({
      where: {
        id: invoiceId,
        userId: session.user?.id,
      },
      select: {
        id: true,
        invoiceName: true,
        invoiceNumber: true,
        currency: true,
        fromName: true,
        fromEmail: true,
        fromAddress: true,
        clientName: true,
        clientAddress: true,
        clientEmail: true,
        date: true,
        dueDate: true,
        invoiceItemDescription: true,
        invoiceItemQuantity: true,
        invoiceItemRate: true,
        total: true,
        paidAmount: true,
        status: true,
        note: true,
        // Include receipts to calculate remaining balance
        receipts: {
          select: {
            amount: true,
          },
        },
      },
    });

    if (!data) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Calculate remaining balance
    const totalPaid = data.receipts.reduce(
      (sum, receipt) => sum + receipt.amount,
      0
    );
    const remainingBalance = data.total - totalPaid;

    // Remove receipts from the response to keep it clean
    const { receipts, ...invoiceData } = data;

    return NextResponse.json({
      ...invoiceData,
      totalPaid,
      remainingBalance,
    });
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice data" },
      { status: 500 }
    );
  }
}