import prisma from "@/app/utils/db";
import { requireUser } from "@/app/utils/hooks";
import { emailClient } from "@/app/utils/mailtrap";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ invoiceId: string }>;
  }
) {
  try {
    const session = await requireUser();

    const { invoiceId } = await params;

    const invoiceData = await prisma.invoice.findUnique({
      where: {
        id: invoiceId,
        userId: session.user?.id,
      },
    });

    if (!invoiceData) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const sender = {
      email: "hello@demomailtrap.com",
      name: "William G. Onyami",
    };

    await emailClient.send({
      from: sender,
      to: [{ email: "imayno85@gmail.com" }],
      template_uuid: "b7b5b035-bfaa-4bcb-813d-aab38de5775d",
      template_variables: {
        "first_name": invoiceData.clientName,
        "company_info_name": "KGSL Invoices",
        "company_info_address": "Kampala, Uganda",
        "company_info_city": "Mukono",
        "company_info_zip_code": "11005",
        "company_info_country": "Uganda"
      }
    });


    // console.log("Sender:", sender);
    // console.log("Invoice Data:", invoiceData);


    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to send email reminder" },
      { status: 500 }
    );
  }
}
