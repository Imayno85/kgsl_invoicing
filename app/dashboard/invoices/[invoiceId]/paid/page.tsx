// app/dashboard/invoices/[invoiceId]/paid/page.tsx

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Image from "next/image";
import PaidGif from "@/public/paid-gif.gif";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { SubmitButton } from "@/app/components/SubmitButtons";
import prisma from "@/app/utils/db";
import { redirect } from "next/navigation";
import { requireUser } from "@/app/utils/hooks";

async function Authorize(invoiceId: string, userId: string) {
  const data = await prisma.invoice.findUnique({
    where: {
      id: invoiceId,
      userId: userId,
    },
  });

  if (!data) {
    return redirect("/dashboard/invoices");
  }
}

type Params = Promise<{ invoiceId: string }>;

// Define a direct function for handling the form submission
async function handleMarkAsPaid(formData: FormData) {
  "use server";
  
  const invoiceId = formData.get("invoiceId") as string;
  if (!invoiceId) {
    throw new Error("Invoice ID is required");
  }

  const session = await requireUser();
  if (!session?.user?.id) {
    throw new Error("Authentication required");
  }

  try {
    // First, fetch the invoice to get client details
    const invoice = await prisma.invoice.findUnique({
      where: {
        userId: session.user.id,
        id: invoiceId,
      },
      include: {
        receipts: true, // Include existing receipts to check total paid
      },
    });

    if (!invoice) {
      throw new Error("Invoice not found or unauthorized");
    }

    // Calculate existing payments
    const existingPayments =
      invoice.receipts?.reduce((total, receipt) => total + receipt.amount, 0) ||
      0;

    // Calculate remaining amount
    const remainingAmount = invoice.total - existingPayments;

    // Only proceed if there's a remaining amount to pay
    if (remainingAmount <= 0) {
      return redirect(`/dashboard/invoices/${invoiceId}`);
    }

    // Keeping your current redirection route
    return redirect(
      `/dashboard/invoices/${invoiceId}/receipts/create?autoFill=true&amount=${remainingAmount}`
    );
  } catch (error) {
    // If this is a redirect, let it propagate
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error;
    }
    
    // For other errors, throw a new error
    console.error("Error processing invoice payment:", error);
    throw new Error("Failed to process invoice payment");
  }
}

export default async function MarkAsPaid({ params }: { params: Params }) {
  const { invoiceId } = await params;
  const session = await requireUser();
  await Authorize(invoiceId, session.user?.id as string);

  return (
    <div className="flex flex-1 justify-center items-center">
      <Card className="max-w-[500px]">
        <CardHeader>
          <CardTitle>Mark as Paid & Issue Receipt</CardTitle>
          <CardDescription>
            Are you sure you want to mark this invoice as paid and issue a
            receipt?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Image src={PaidGif} alt="Paid Gif" className="rounded-lg" unoptimized />
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          <Link
            href="/dashboard/invoices"
            className={buttonVariants({ variant: "outline" })}
          >
            Cancel
          </Link>
          <form action={handleMarkAsPaid}>
            <input type="hidden" name="invoiceId" value={invoiceId} />
            <SubmitButton text="Mark as Paid & Issue Receipt" />
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}