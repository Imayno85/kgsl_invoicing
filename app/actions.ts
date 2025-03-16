"use server";

import { requireUser } from "./utils/hooks";
import { parseWithZod } from "@conform-to/zod";
import {
  invoiceSchema,
  onboardingSchema,
  receiptSchema,
} from "./utils/zodSchemas";
import prisma from "./utils/db";
import { redirect } from "next/navigation";
import { emailClient } from "./utils/mailtrap";
import { formatCurrency } from "./utils/formatCurrency";
import { InvoiceStatus } from "@prisma/client";
import { parseISO, sub } from "date-fns";
import db from "./utils/db";

// Helper function to determine invoice status based on payments
function determineInvoiceStatus(totalAmount: number, paidAmount: number): InvoiceStatus {
  if (paidAmount >= totalAmount) {
    return "PAID";
  } else if (paidAmount > 0) {
    return "PARTIALLY_PAID";
  } else {
    return "PENDING";
  }
}

export async function getNextInvoiceNumber() {
  const latestInvoice = await prisma.invoice.findFirst({
    orderBy: {
      invoiceNumber: "desc",
    },
    select: {
      invoiceNumber: true,
    },
  });

  let nextNumber;
  if (latestInvoice) {
    nextNumber = latestInvoice.invoiceNumber + 1;
  } else {
    nextNumber = 1001;
  }

  return nextNumber;
}

export async function onboardUser(prevState: unknown, formData: FormData) {
  const session = await requireUser();

  const submission = parseWithZod(formData, {
    schema: onboardingSchema,
  });

  if (submission.status !== "success") {
    return submission.reply();
  }

  await prisma.user.update({
    where: {
      id: session.user?.id,
    },
    data: {
      firstName: submission.value.firstName,
      lastName: submission.value.lastName,
      address: submission.value.address,
    },
  });

  return redirect("/dashboard");
}

export async function createInvoice(prevState: unknown, formData: FormData) {
  const session = await requireUser();

  const submission = parseWithZod(formData, {
    schema: invoiceSchema,
  });

  if (submission.status !== "success") {
    return submission.reply();
  }

  const data = await prisma.invoice.create({
    data: {
      clientAddress: submission.value.clientAddress,
      clientEmail: submission.value.clientEmail,
      clientName: submission.value.clientName,
      currency: submission.value.currency,
      date: submission.value.date,
      dueDate: submission.value.dueDate,
      fromAddress: submission.value.fromAddress,
      fromEmail: submission.value.fromEmail,
      fromName: submission.value.fromName,

      invoiceItemDescription: submission.value.invoiceItemDescription,
      invoiceItemQuantity: submission.value.invoiceItemQuantity,
      invoiceItemRate: submission.value.invoiceItemRate,
      invoiceName: submission.value.invoiceName,
      invoiceNumber: submission.value.invoiceNumber,

      status: submission.value.status,
      total: submission.value.total,
      note: submission.value.note,
      paidAmount: 0,

      userId: session.user?.id,
    },
  });

  // Send email notification after successful invoice creation
  try {
    const sender = {
      email: "hello@knightguardssecurity.com",
      name: "Knight Guards",
    };

    await emailClient.send({
      from: sender,
      to: [{ email: submission.value.clientEmail }],
      template_uuid: "93045c29-d3ca-4871-b5ff-0a925f582e34",
      template_variables: {
        clientName: submission.value.clientName,
        invoiceNumber: submission.value.invoiceNumber,
        invoiceDueDate: new Intl.DateTimeFormat("en-UG", {
          dateStyle: "long",
        }).format(new Date(submission.value.date)),
        totalAmount: formatCurrency({
          amount: submission.value.total,
          currency: submission.value.currency as "UGX" | "USD",
        }),
        invoiceLink:
          process.env.NODE_ENV !== "production"
            ? `http://localhost:3000/api/invoice/${data.id}`
            : `https://localhost:3000/api/invoice/${data.id}`,
      },
    });
  } catch (error) {
    console.warn("Failed to send invoice email notification:", error);
    // Continue with redirect even if email fails
  }

  return redirect("/dashboard/invoices");
}

export async function editInvoice(prevState: unknown, formData: FormData) {
  const session = await requireUser();

  const submission = parseWithZod(formData, {
    schema: invoiceSchema,
  });

  if (submission.status !== "success") {
    return submission.reply();
  }

  const invoiceId = formData.get("id") as string;
  if (!invoiceId) {
    return { error: "Invoice ID is required" };
  }

  // Get existing invoice with all payments
  const existingInvoice = await prisma.invoice.findUnique({
    where: {
      id: invoiceId,
      userId: session.user?.id,
    },
    select: {
      paidAmount: true,
      status: true,
      receipts: {
        select: {
          amount: true,
        },
      },
    },
  });

  if (!existingInvoice) {
    return { error: "Invoice not found or unauthorized" };
  }

  // Calculate total payments from receipts to ensure data integrity
  const totalPayments = existingInvoice.receipts.reduce(
    (sum, receipt) => sum + receipt.amount, 
    0
  );
  
  // Use the calculated amount instead of stored paidAmount for safety
  const paidAmount = totalPayments;

  // Determine appropriate status based on payments and new total
  const newStatus = determineInvoiceStatus(submission.value.total, paidAmount);

  try {
    const data = await prisma.invoice.update({
      where: {
        id: invoiceId,
        userId: session.user?.id,
      },
      data: {
        clientAddress: submission.value.clientAddress,
        clientEmail: submission.value.clientEmail,
        clientName: submission.value.clientName,
        currency: submission.value.currency,
        date: submission.value.date,
        dueDate: submission.value.dueDate,

        fromAddress: submission.value.fromAddress,
        fromEmail: submission.value.fromEmail,
        fromName: submission.value.fromName,

        invoiceItemDescription: submission.value.invoiceItemDescription,
        invoiceItemQuantity: submission.value.invoiceItemQuantity,
        invoiceItemRate: submission.value.invoiceItemRate,
        invoiceName: submission.value.invoiceName,
        invoiceNumber: submission.value.invoiceNumber,

        status: newStatus,
        total: submission.value.total,
        note: submission.value.note,
        paidAmount: paidAmount, // Set the verified payment amount
      },
    });

    // Send email notification after successful update
    try {
      const sender = {
        email: "hello@knightguardssecurity.com",
        name: "Knight Guards",
      };

      await emailClient.send({
        from: sender,
        to: [{ email: submission.value.clientEmail }],
        template_uuid: "c52c99e9-7fdf-493a-9719-af211baf179f",
        template_variables: {
          clientName: submission.value.clientName,
          invoiceNumber: submission.value.invoiceNumber,
          invoiceDueDate: new Intl.DateTimeFormat("en-UG", {
            dateStyle: "long",
          }).format(new Date(submission.value.date)),
          totalAmount: formatCurrency({
            amount: submission.value.total,
            currency: submission.value.currency as "UGX" | "USD",
          }),
          invoiceLink:
            process.env.NODE_ENV !== "production"
              ? `http://localhost:3000/api/invoice/${data.id}`
              : `https://localhost:3000/api/invoice/${data.id}`,
        },
      });
    } catch (emailError) {
      console.warn("Failed to send invoice update email:", emailError);
      // Continue with redirect even if email fails
    }

    return redirect("/dashboard/invoices");
  } catch (error) {
    console.error("Error updating invoice:", error);
    return { error: "Failed to update invoice. Please try again." };
  }
}

export async function DeleteInvoice(invoiceId: string) {
  try {
    const session = await requireUser();

    if (!session?.user?.id) {
      return { error: "Not authenticated" };
    }

    // Delete the invoice
    await prisma.invoice.delete({
      where: {
        id: invoiceId,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting invoice:", error);
    return { error: "Failed to delete invoice." };
  }
}
export async function MarkAsPaidAction(invoiceId: string) {
  const session = await requireUser();

  if (!invoiceId) {
    return { error: "Invoice ID is required" };
  }

  try {
    // First, fetch the invoice to get client details
    const invoice = await prisma.invoice.findUnique({
      where: {
        userId: session.user?.id,
        id: invoiceId,
      },
      include: {
        receipts: true, // Include existing receipts to check total paid
      },
    });

    if (!invoice) {
      throw new Error("Invoice not found or unauthorized");
    }

    // Calculate existing payments more reliably from receipts
    const existingPayments = invoice.receipts.reduce(
      (total, receipt) => total + receipt.amount, 
      0
    );

    // Calculate remaining amount
    const remainingAmount = invoice.total - existingPayments;

    // Only proceed if there's a remaining amount to pay
    if (remainingAmount <= 0) {
      // If no remaining amount, ensure status is PAID and redirect
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: "PAID",
          paidAmount: existingPayments,
        },
      });
      return redirect(`/dashboard/invoices/${invoiceId}`);
    }

    // Redirect to the receipt creation form
    return redirect(
      `/dashboard/invoices/${invoiceId}/receipts/new?autoFill=true&amount=${remainingAmount}`
    );
  } catch (error) {
    console.error("Error preparing invoice for payment:", error);
    return { error: "Failed to process invoice for payment." };
  }
}

// RECEIPT GENERATION

// Define the FormDataWithPartialPayment type
interface FormDataWithPartialPayment extends FormData {
  isPartialPayment: boolean;
}

// Function to generate a unique receipt number
async function generateReceiptNumber() {
  try {
    const prefix = "KGSLRCPT";
    // Try to get the latest receipt number first
    const latestReceipt = await prisma.receipt.findFirst({
      orderBy: {
        receiptNumber: "desc",
      },
      select: {
        receiptNumber: true,
      },
    });

    // If there's an existing receipt, increment its numeric part
    if (latestReceipt && typeof latestReceipt.receiptNumber === "string") {
      const numericPart = latestReceipt.receiptNumber.split("-")[1];
      if (numericPart && !isNaN(parseInt(numericPart))) {
        const nextNumber = parseInt(numericPart) + 1;
        return `${prefix}-${nextNumber.toString().padStart(6, "0")}`;
      }
    }

    // Fallback to random generation if we can't parse the latest receipt number
    const randomNumber = Math.floor(Math.random() * 1000000);
    return `${prefix}-${randomNumber.toString().padStart(6, "0")}`;
  } catch (error) {
    console.warn("Error generating receipt number:", error);
    // Fallback to timestamp-based number if database query fails
    const timestamp = new Date().getTime() % 1000000;
    return `KGSLRCPT-${timestamp.toString().padStart(6, "0")}`;
  }
}

export async function createReceipt(prevState: unknown, formData: FormData) {
  const session = await requireUser();
  if (!session?.user?.id) {
    return { error: "Authentication required" };
  }

  const invoiceId = formData.get("invoiceId");
  if (!invoiceId || typeof invoiceId !== "string") {
    return { error: "Invalid invoice ID" };
  }

  // Check if this is a partial payment
  const isPartialPayment = formData.get("isPartialPayment") === "true";

  try {
    // Fetch the invoice to check if it exists and belongs to the user
    const invoice = await prisma.invoice.findUnique({
      where: {
        id: invoiceId,
        userId: session.user.id,
      },
      include: {
        receipts: true, // Include all receipts to calculate total paid accurately
      },
    });

    if (!invoice) {
      return {
        error: "Invoice not found or you don't have permission to access it",
      };
    }

   // Parse and validate payment amounts before starting the transaction
   const amountPaidStr = formData.get("amountPaid");
   if (!amountPaidStr || typeof amountPaidStr !== "string") {
     return { error: "Amount paid is required" };
   }

   const amountPaid = Number(amountPaidStr);
   if (isNaN(amountPaid) || amountPaid <= 0) {
     return { error: "Invalid payment amount" };
   }

   // Parse payment date properly before transaction
   let paymentDate: Date;
   try {
     const dateValue = formData.get("paymentDate");

     if (!dateValue) {
       paymentDate = new Date();
     } else if (typeof dateValue === "string") {
       paymentDate = new Date(dateValue);
     } else {
       paymentDate = new Date();
     }

     if (isNaN(paymentDate.getTime())) {
       throw new Error("Invalid date");
     }
   } catch (dateError) {
     paymentDate = new Date();
   }

   const paymentMethod = formData.get("paymentMethod");
   if (!paymentMethod || typeof paymentMethod !== "string") {
     return { error: "Payment method is required" };
   }

   // Use a transaction to ensure data consistency
   const result = await prisma.$transaction(async (tx) => {
     // Calculate existing payments directly from the fetched invoice receipts
     const totalPreviousPayments = invoice.receipts.reduce(
       (sum, receipt) => sum + receipt.amount,
       0
     );

     const totalPaymentsWithCurrent = totalPreviousPayments + amountPaid;

     // Check that we're not overpaying
     if (
       totalPaymentsWithCurrent > invoice.total &&
       !invoice.allowOverpayment
     ) {
       throw new Error(
         `Total payments (${totalPaymentsWithCurrent}) would exceed invoice amount (${invoice.total})`
       );
     }

     // Calculate remaining amount
     const remainingAmount = invoice.total - totalPaymentsWithCurrent;

     // Determine new status using the helper function
     const newStatus = determineInvoiceStatus(invoice.total, totalPaymentsWithCurrent);

    // Generate receipt number
    const receiptNumber = await generateReceiptNumber();

    // Create the receipt
    const receipt = await tx.receipt.create({
      data: {
        receiptNumber: receiptNumber,
        invoiceId: invoiceId,
        amount: amountPaid,
        paymentDate: paymentDate,
        paymentMethod: paymentMethod,
        reference: (formData.get("reference") as string) || null,
        note: (formData.get("note") as string) || null,
        currency: invoice.currency,
      },
    });

    // Update invoice status and record the total paid amount
    const updatedInvoice = await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status: newStatus,
        paidAmount: totalPaymentsWithCurrent,
      },
    });

    return { updatedInvoice, receipt, remainingAmount };
  });

  // Send receipt email AFTER the transaction completes successfully
  if (result?.receipt && result?.updatedInvoice) {
    try {
      const sender = {
        email: "hello@knightguardssecurity.com",
        name: "Knight Guards",
      };

      await emailClient.send({
        from: sender,
        to: [{ email: result.updatedInvoice.clientEmail }],
        template_uuid: "b2eb4652-9d34-450e-bd0d-8357cba23402",
        template_variables: {
          clientName: result.updatedInvoice.clientName,
          invoiceNumber: result.updatedInvoice.invoiceNumber,
          receiptNumber: result.receipt.receiptNumber,
          paymentDate: new Intl.DateTimeFormat("en-UG", {
            dateStyle: "long",
          }).format(result.receipt.paymentDate),
          totalAmount: formatCurrency({
            amount: result.receipt.amount,
            currency: result.updatedInvoice.currency as "UGX" | "USD",
          }),
          isPaid: result.updatedInvoice.status === "PAID",
          isPartialPayment: result.updatedInvoice.status === "PARTIALLY_PAID",
          remainingAmount: formatCurrency({
            amount:
              result.updatedInvoice.total -
              (result.updatedInvoice.paidAmount || 0),
            currency: result.updatedInvoice.currency as "UGX" | "USD",
          }),
          receiptLink:
            process.env.NODE_ENV !== "production"
              ? `http://localhost:3000/api/receipt/${result.receipt.id}`
              : `https://localhost:3000/api/receipt/${result.receipt.id}`,
        },
      });
    } catch (emailError) {
      console.warn("Failed to send receipt email notification:", emailError);
      // Continue with the redirect even if email fails
    }
  }

  // Redirect to invoice page
  return redirect(`/dashboard/invoices/${invoiceId}`);
} catch (error) {
  const errorMessage =
    error instanceof Error ? error.message : "Unknown error occurred";
  console.error(`Receipt creation failed: ${errorMessage}`);
  return { error: errorMessage };
}
}

export async function getNextReceiptNumber() {
try {
  return await prisma.$transaction(async (tx) => {
    const latestReceipt = await tx.receipt.findFirst({
      orderBy: {
        receiptNumber: "desc",
      },
      select: {
        receiptNumber: true,
      },
    });

    // If no receipts exist yet, start with 5001
    const nextNumber = latestReceipt ? latestReceipt.receiptNumber + 1 : 5001;

    return nextNumber;
  });
} catch (error) {
  console.error("Error getting next receipt number:", error);
  return 5001; // Return a default value if the query fails
}
}

export async function getReceiptsForInvoice(invoiceId: string) {
if (!invoiceId) {
  throw new Error("Invoice ID is required");
}

const session = await requireUser();
if (!session?.user?.id) {
  throw new Error("Authentication required");
}

try {
  // First, ensure user owns this invoice
  const invoice = await prisma.invoice.findUnique({
    where: {
      id: invoiceId,
      userId: session.user.id,
    },
  });

  if (!invoice) {
    throw new Error("Invoice not found or unauthorized");
  }

  return prisma.receipt.findMany({
    where: {
      invoiceId: invoiceId,
    },
    orderBy: {
      paymentDate: "desc",
    },
  });
} catch (error) {
  console.error("Error fetching receipts for invoice:", error);
  throw error; // Re-throw to be handled by the caller
}
}

export async function deleteReceipt(receiptId: string) {
if (!receiptId) {
  throw new Error("Receipt ID is required");
}

const session = await requireUser();
if (!session?.user?.id) {
  throw new Error("Authentication required");
}

try {
  // Find the receipt and its associated invoice
  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
    include: {
      invoice: {
        select: {
          id: true,
          userId: true,
          total: true,
        },
      },
    },
  });

  if (!receipt || receipt.invoice.userId !== session.user.id) {
    throw new Error("Receipt not found or unauthorized");
  }

  // Use a transaction to update everything
  await prisma.$transaction(async (tx) => {
    // Delete the receipt
    await tx.receipt.delete({
      where: { id: receiptId },
    });

    // Recalculate total paid amount
    const remainingReceipts = await tx.receipt.findMany({
      where: { invoiceId: receipt.invoiceId },
    });

    const totalPaid = remainingReceipts.reduce((sum, r) => sum + r.amount, 0);

    // Use the helper function to determine the correct status
    const newStatus = determineInvoiceStatus(receipt.invoice.total, totalPaid);

    // Update the invoice
    await tx.invoice.update({
      where: { id: receipt.invoice.id },
      data: {
        paidAmount: totalPaid,
        status: newStatus,
      },
    });
  });

  // Redirect to the invoice detail page so user can see updated status
  return redirect(`/dashboard/invoices/${receipt.invoice.id}`);
} catch (error) {
  console.error("Error deleting receipt:", error);
  throw error; // Re-throw to be handled by the caller
}
}

export async function getReceiptById(receiptId: string) {
  const session = await requireUser();
  if (!session?.user?.id) {
    throw new Error("Authentication required");
  }

  if (!receiptId) {
    throw new Error("Receipt ID is required");
  }

  try {
    // First, fetch the receipt with basic invoice details
    const receipt = await prisma.receipt.findUnique({
      where: {
        id: receiptId,
      },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            clientName: true,
            clientEmail: true,
            fromName: true,
            fromEmail: true,
            total: true,
            currency: true,
            userId: true,
          },
        },
      },
    });

    if (!receipt) {
      throw new Error("Receipt not found");
    }

    // Verify that the user has access to this receipt
    if (receipt.invoice.userId !== session.user.id) {
      throw new Error("Unauthorized access to receipt");
    }

    // Return the receipt data with invoice details
    return receipt;
  } catch (error) {
    console.error("Error fetching receipt by ID:", error);
    throw error; // Re-throw to be handled by the caller
  }
}


export async function getAllReceipts() {
  const session = await requireUser();
  const userId = session?.user?.id;

  if (!userId) {
    return [];
  }

  try {
    const data = await prisma.receipt.findMany({
      where: {
        invoice: {
          userId: userId,
        },
      },
      orderBy: {
        paymentDate: "desc",
      },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            clientName: true,
            clientEmail: true,
            currency: true,
          },
        },
      },
    });
    
    // Transform the data to include invoice fields at the receipt level
    const transformedData = data.map(receipt => ({
      ...receipt,
      invoiceNumber: receipt.invoice.invoiceNumber,
      clientName: receipt.invoice.clientName,
      clientEmail: receipt.invoice.clientEmail,
      invoiceId: receipt.invoice.id,
      // Keep other fields
    }));
    
    return transformedData;
  } catch (error) {
    console.error("Error fetching receipts:", error);
    return [];
  }
}

// Add a function to get remaining balance for an invoice
export async function getInvoiceRemainingBalance(invoiceId: string) {
 const session = await requireUser();
 
 try {
   const invoice = await prisma.invoice.findUnique({
     where: {
       id: invoiceId,
       userId: session.user?.id,
     },
     select: {
       total: true,
       paidAmount: true,
       currency: true,
     },
   });

   if (!invoice) {
     throw new Error("Invoice not found or unauthorized");
   }

   const remainingBalance = invoice.total - (invoice.paidAmount || 0);
   
   return {
     remainingBalance,
     formattedRemainingBalance: formatCurrency({
       amount: remainingBalance,
       currency: invoice.currency as "UGX" | "USD",
     }),
     currency: invoice.currency,
   };
 } catch (error) {
   console.error("Error calculating remaining balance:", error);
   throw error;
 }
}

// Add a function to synchronize and repair invoice statuses and payment amounts
export async function syncInvoicePayments(invoiceId: string) {
const session = await requireUser();

try {
  // Get the invoice with all its receipts
  const invoice = await prisma.invoice.findUnique({
    where: {
      id: invoiceId,
      userId: session.user?.id,
    },
    include: {
      receipts: true,
    },
  });

  if (!invoice) {
    throw new Error("Invoice not found or unauthorized");
  }

  // Calculate total payments from receipts
  const totalPaid = invoice.receipts.reduce(
    (sum, receipt) => sum + receipt.amount, 
    0
  );

  // Determine the correct status
  const correctStatus = determineInvoiceStatus(invoice.total, totalPaid);

  // Update the invoice if needed
  if (invoice.paidAmount !== totalPaid || invoice.status !== correctStatus) {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: totalPaid,
        status: correctStatus,
      },
    });
    return { success: true, message: "Invoice payment data synchronized" };
  }

  return { success: true, message: "Invoice payment data already in sync" };
} catch (error) {
  console.error("Error synchronizing invoice payments:", error);
  throw error;
}
}

export async function searchClients(searchTerm: string) {
  try {
    if (!searchTerm || searchTerm.length < 2) {
      return [];
    }
    
    // Find unique clients from the invoices table instead
    const clients = await db.invoice.findMany({
      where: {
        OR: [
          { clientName: { contains: searchTerm, mode: 'insensitive' } },
          { clientEmail: { contains: searchTerm, mode: 'insensitive' } },
        ]
      },
      distinct: ['clientEmail'],
      take: 10,
      select: {
        id: true,
        clientName: true,
        clientEmail: true,
        clientAddress: true,
      }
    });
    
    // Map to match expected interface
    return clients.map(client => ({
      id: client.id,
      name: client.clientName,
      email: client.clientEmail,
      address: client.clientAddress || '',
    }));
  } catch (error) {
    console.error("Error searching clients:", error);
    throw new Error("Failed to search clients");
  }
}