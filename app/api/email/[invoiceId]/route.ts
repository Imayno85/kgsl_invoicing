// app/api/email/[invoiceId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/utils/db";
import { emailClient } from "@/app/utils/mailtrap";
import { formatCurrency } from "@/app/utils/formatCurrency";

export async function POST(
  request: NextRequest,
  context: { params: { invoiceId: string } }
) {
  try {
    const { invoiceId } = context.params;
    
    if (!invoiceId) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 }
      );
    }

    // Find the invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Send email notification
    const sender = {
      email: "hello@knightguardssecurity.com",
      name: "Knight Guards",
    };

    await emailClient.send({
      from: sender,
      to: [{ email: invoice.clientEmail }],
      template_uuid: "cf834ff2-c775-48b5-942a-9de8ada6000b",
      template_variables: {
        clientName: invoice.clientName,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDueDate: new Intl.DateTimeFormat("en-UG", {
          dateStyle: "long",
        }).format(new Date(invoice.date)),
        totalAmount: formatCurrency({
          amount: invoice.total,
          currency: invoice.currency as "UGX" | "USD",
        }),
        invoiceLink:
          process.env.NODE_ENV !== "production"
            ? `http://localhost:3000/api/invoice/${invoice.id}`
            : `https://localhost:3000/api/invoice/${invoice.id}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}