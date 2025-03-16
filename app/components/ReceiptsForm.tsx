// app/components/ReceiptsForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createReceipt } from "@/app/actions";
import { formatCurrency } from "@/app/utils/formatCurrency";
import { Progress } from "@/components/ui/progress";

// Define the receiptSchema to use in our form
const receiptSchema = z.object({
  invoiceId: z.string(),
  amountPaid: z.coerce
    .number()
    .min(0.01, { message: "Amount must be greater than 0" })
    .refine((val) => val >= 0, { message: "Amount must be greater than 0" }),
  paymentDate: z.date(),
  paymentMethod: z
    .string()
    .min(1, { message: "Please select a payment method" }),
  reference: z.string().optional(),
  note: z.string().optional(),
});

type ReceiptFormValues = z.infer<typeof receiptSchema>;

// Define the FormDataWithPartialPayment type
interface FormDataWithPartialPayment extends FormData {
  isPartialPayment: boolean;
}

interface InvoiceData {
  id: string;
  invoiceNumber: number;
  invoiceName: string;
  date: string;
  dueDate: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  total: number;
  paidAmount: number; // Add this field to track amount already paid
  currency: string;
  status: string;
  note?: string;
}

interface ReceiptsFormProps {
  invoiceId: string;
}

export function ReceiptsForm({ invoiceId }: ReceiptsFormProps) {
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remainingBalance, setRemainingBalance] = useState(0);
  const [paymentProgress, setPaymentProgress] = useState(0);
  const router = useRouter();

  // Fetch invoice data when component mounts
  useEffect(() => {
    async function fetchInvoice() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/invoice/${invoiceId}/data`);

        if (!response.ok) {
          throw new Error(`Failed to fetch invoice: ${response.statusText}`);
        }

        const invoiceData = await response.json();
        setInvoice(invoiceData);

        // Calculate remaining balance and payment progress
        const paidAmount = invoiceData.paidAmount || 0;
        const remaining = Math.max(0, invoiceData.total - paidAmount);
        const progress = invoiceData.total > 0 
          ? Math.min(100, (paidAmount / invoiceData.total) * 100) 
          : 0;
        
        setRemainingBalance(remaining);
        setPaymentProgress(progress);

        // When invoice data is loaded, reset form with default values
        if (invoiceData) {
          form.reset({
            invoiceId: invoiceId,
            // Set default amount to the remaining balance instead of full total
            amountPaid: remaining,
            paymentDate: new Date(),
            paymentMethod: "",
            reference: "",
            note: "",
          });
        }
      } catch (error) {
        console.error("Error fetching invoice:", error);
        toast.error("Failed to fetch invoice details");
      } finally {
        setIsLoading(false);
      }
    }

    fetchInvoice();
  }, [invoiceId]);

  // Initialize form with default values
  const form = useForm<ReceiptFormValues>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      invoiceId: invoiceId,
      amountPaid: 0,
      paymentDate: new Date(),
      paymentMethod: "",
      reference: "",
      note: "",
    },
  });

  // Get the watch function to watch for changes to amountPaid
  const watchAmountPaid = form.watch("amountPaid");

  // Validate that amount paid doesn't exceed remaining balance
  useEffect(() => {
    if (invoice && watchAmountPaid > remainingBalance) {
      form.setError("amountPaid", {
        type: "manual",
        message: `Amount cannot exceed remaining balance of ${formatCurrency({
          amount: remainingBalance,
          currency: invoice.currency === "UGX" || invoice.currency === "USD" 
            ? invoice.currency 
            : "USD",
        })}`,
      });
    } else {
      form.clearErrors("amountPaid");
    }
  }, [watchAmountPaid, remainingBalance, invoice]);

  async function onSubmit(data: ReceiptFormValues) {
    if (!invoice) return;

    try {
      setIsSubmitting(true);

      // Determine if it's a partial payment (comparing with remaining balance)
      const isPartial = data.amountPaid < remainingBalance;

      // Create a new FormDataWithPartialPayment object
      const formDataWithPartialPayment =
        new FormData() as FormDataWithPartialPayment;

      // Append the data to the FormDataWithPartialPayment object
      formDataWithPartialPayment.append("invoiceId", data.invoiceId);
      formDataWithPartialPayment.append(
        "amountPaid",
        data.amountPaid.toString()
      );
      formDataWithPartialPayment.append(
        "paymentDate",
        data.paymentDate.toISOString()
      );
      formDataWithPartialPayment.append("paymentMethod", data.paymentMethod);

      if (data.reference) {
        formDataWithPartialPayment.append("reference", data.reference);
      }

      if (data.note) {
        formDataWithPartialPayment.append("note", data.note);
      }

      // Set the isPartialPayment flag based on total invoice amount
      const newTotalPaid = (invoice.paidAmount || 0) + data.amountPaid;
      formDataWithPartialPayment.isPartialPayment = newTotalPaid < invoice.total;

      // Create the receipt
      await createReceipt(null, formDataWithPartialPayment);

      toast.success("Receipt created successfully");
      router.push(`/dashboard/receipts`);
    } catch (error) {
      console.error("Error creating receipt:", error);
      toast.error("Failed to create receipt");
    } finally {
      setIsSubmitting(false);
    }
  }

  function formatDisplayDate(dateString: string) {
    try {
      return format(parseISO(dateString), "PPP");
    } catch (error) {
      return "Invalid date";
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading invoice details...</span>
          </div>
        ) : invoice ? (
          <>
            <Card className="bg-muted/30">
              <CardHeader>
                <CardTitle>Invoice #{invoice.invoiceNumber}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-sm">Client</h3>
                    <p>{invoice.clientName}</p>
                    <p className="text-sm text-muted-foreground">
                      {invoice.clientEmail}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {invoice.clientAddress}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Invoice Details</h3>
                    <p>Invoice: {invoice.invoiceName}</p>
                    <p className="text-sm text-muted-foreground">
                      Date: {formatDisplayDate(invoice.date)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Due: {formatDisplayDate(invoice.dueDate)}
                    </p>
                    
                    {/* Payment summary with progress */}
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Payment Progress:</span>
                        <span>{paymentProgress.toFixed(0)}%</span>
                      </div>
                      <Progress value={paymentProgress} className="h-2" />
                      
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Total Amount</p>
                          <p className="font-medium">
                            {formatCurrency({
                              amount: invoice.total,
                              currency: invoice.currency === "UGX" || invoice.currency === "USD"
                                ? invoice.currency
                                : "USD",
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Paid Amount</p>
                          <p className="font-medium">
                            {formatCurrency({
                              amount: invoice.paidAmount || 0,
                              currency: invoice.currency === "UGX" || invoice.currency === "USD"
                                ? invoice.currency
                                : "USD",
                            })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-2 pt-2 border-t">
                        <div className="flex justify-between">
                          <p className="font-semibold">Remaining Balance:</p>
                          <p className="font-bold">
                            {formatCurrency({
                              amount: remainingBalance,
                              currency: invoice.currency === "UGX" || invoice.currency === "USD"
                                ? invoice.currency
                                : "USD",
                            })}
                          </p>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mt-2">
                      Status:{" "}
                      <span
                        className={`font-medium ${
                          invoice.status === "PAID"
                            ? "text-green-500"
                            : invoice.status === "PARTIALLY_PAID"
                            ? "text-amber-500"
                            : "text-red-500"
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </p>
                  </div>
                </div>

                {invoice.note && (
                  <div className="mt-2">
                    <h3 className="font-semibold text-sm">Notes</h3>
                    <div className="text-sm bg-muted p-2 rounded-md mt-1">
                      {invoice.note.split("\n").map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="amountPaid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount Paid</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        max={remainingBalance}
                        {...field}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          field.onChange(isNaN(value) ? 0 : value);
                        }}
                      />
                    </FormControl>
                    <div className="text-xs text-muted-foreground mt-1">
                      Maximum payment: {formatCurrency({
                        amount: remainingBalance,
                        currency: invoice?.currency === "UGX" || invoice?.currency === "USD"
                          ? invoice.currency
                          : "USD",
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Payment Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full pl-3 text-left font-normal flex justify-between"
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Select date</span>
                            )}
                            <CalendarIcon className="h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Payment Method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Credit Card">Credit Card</SelectItem>
                        <SelectItem value="Bank Transfer">
                          Bank Transfer
                        </SelectItem>
                        <SelectItem value="Mobile Money">
                          Mobile Money
                        </SelectItem>
                        <SelectItem value="Check">Check</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference/Transaction ID</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Optional reference number"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional notes about this payment..."
                      className="min-h-24"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/dashboard/invoices/${invoiceId}`)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || (watchAmountPaid > remainingBalance)}
                className="min-w-32"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Create Receipt"
                )}
              </Button>
            </div>
          </>
        ) : (
          <Card className="bg-destructive/10 p-4">
            <div className="text-center">
              <h3 className="font-semibold text-lg">Invoice Not Found</h3>
              <p className="text-muted-foreground mt-2">
                The requested invoice could not be found or you don't have
                permission to access it.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push("/dashboard/invoices")}
              >
                Return to Invoices
              </Button>
            </div>
          </Card>
        )}
      </form>
    </Form>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}