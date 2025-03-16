// app/utils/zodSchemas.ts
import { z } from "zod";

export const onboardingSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  address: z.string().min(2, "Address is required"),
});

export const invoiceSchema = z.object({
  invoiceName: z.string().min(1, "Invoice Name is required"),
  total: z.number().min(1, "UGX 1 is minimum"),
  status: z.enum(["PAID", "PENDING"]).default("PENDING"),
  date: z.string().min(1, "Date is required"),
  dueDate: z.number().min(0, "Due Date is required"),
  fromName: z.string().min(1, "Your Name is required"),
  fromEmail: z.string().email("Invalid Email address"),
  fromAddress: z.string().min(1, "Your Address is required"),

  clientName: z.string().min(1, "Client Name is required"),
  clientEmail: z.string().email("Invalid Email address"),
  clientAddress: z.string().min(1, "Client Address is required"),

  currency: z.string().min(1, "Currency is required"),
  invoiceNumber: z.number().min(1, "Minimum Invoice Number of 1"),

  note: z.string().optional(),

  invoiceItemDescription: z.string().min(1, "Description is required"),
  invoiceItemQuantity: z.number().min(1, "Min Quantity is 1"),
  invoiceItemRate: z.number().min(1, "Min Rate is 1"),
});

export const receiptSchema = z.object({
  receiptNumber: z.coerce.number().int().min(1, "Receipt number is required"),
  amount: z.coerce.number().positive("Amount is required"),
  paymentDate: z.date(),
  paymentMethod: z.string().min(1, "Payment method is required"),
  reference: z.string().optional(),
  note: z.string().optional(),
  invoiceId: z.string(),
  currency: z.enum(["UGX", "USD"]),
});