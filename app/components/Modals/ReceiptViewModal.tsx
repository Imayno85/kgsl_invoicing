"use client";

import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/app/utils/formatCurrency";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarIcon, Download, Printer, AlertCircle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, isValid } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { generateReceiptPDF } from "@/app/utils/generateReceiptPDF";

interface Receipt {
  id: string;
  receiptNumber: string;
  invoiceId: string;
  invoiceNumber?: string | number;
  clientName?: string;
  clientEmail?: string;
  amount: number;
  currency: "UGX" | "USD";
  paymentDate: Date | string;
  paymentMethod: string;
  reference?: string;
  note?: string | null;
  status?: "completed" | "pending" | "failed";
  createdAt?: Date | string;
}

interface ReceiptViewModalProps {
  receiptId: string | null;
  initialData?: Receipt | null;
  open: boolean;
  onClose: () => void;
}

// Payment method badge styling with improved contrast and accessibility
const getPaymentMethodStyle = (method: string) => {
  switch (method.toLowerCase()) {
    case "cash":
      return "bg-green-100 text-green-800 hover:bg-green-100";
    case "bank transfer":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100";
    case "credit card":
      return "bg-purple-100 text-purple-800 hover:bg-purple-100";
    case "mobile money":
      return "bg-orange-100 text-orange-800 hover:bg-orange-100";
    case "check":
    case "cheque":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100";
  }
};

// Status badge styling
const getStatusStyle = (status?: string) => {
  switch (status?.toLowerCase()) {
    case "completed":
      return "bg-green-100 text-green-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "failed":
      return "bg-red-100 text-red-800";
    default:
      return "bg-green-100 text-green-800"; // Default to completed
  }
};

export function ReceiptViewModal({ receiptId, initialData, open, onClose }: ReceiptViewModalProps) {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{message: string, type: "success" | "error"} | null>(null);
  
  // Reference for the printable receipt content
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset state when modal opens
    if (open) {
      // Reset the action message when the modal opens
      setActionMessage(null);
      
      // If initialData is provided, use it instead of fetching
      if (initialData) {
        try {
          // Ensure dates are proper Date objects if valid
          const processedData = {
            ...initialData,
            paymentDate: parseDateSafely(initialData.paymentDate),
            createdAt: initialData.createdAt ? parseDateSafely(initialData.createdAt) : new Date(),
            status: initialData.status || "completed" // Default status
          };
          setReceipt(processedData);
          setIsLoading(false);
          setError(null);
          return;
        } catch (err) {
          console.error("Error processing initial data:", err);
          // If there's an error processing the data, fall back to fetching
        }
      }
      
      // Only fetch if no initial data provided or there was an error processing it
      fetchReceiptDetails();
    }
  }, [receiptId, initialData, open]);

  // Safely parse date values
  const parseDateSafely = (dateValue: Date | string): Date => {
    if (dateValue instanceof Date) return dateValue;
    
    const parsed = new Date(dateValue);
    return isValid(parsed) ? parsed : new Date();
  };

  async function fetchReceiptDetails() {
    if (!receiptId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Replace with your actual API endpoint
      const response = await fetch(`/api/receipts/${receiptId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load receipt details (${response.status})`);
      }
      
      const data = await response.json();
      
      // Convert date strings to Date objects
      data.paymentDate = parseDateSafely(data.paymentDate);
      data.createdAt = parseDateSafely(data.createdAt || data.paymentDate);
      data.status = data.status || "completed"; // Default status if not provided
      
      setReceipt(data);
    } catch (err) {
      console.error("Error fetching receipt:", err);
      setError("Could not load receipt details. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  // Function to format date with date-fns
  const formatDate = (date: Date | string) => {
    if (!date) return "N/A";
    const parsedDate = parseDateSafely(date);
    return format(parsedDate, "PPP");
  };
  
  // Function to format time with date-fns
  const formatTime = (date: Date | string) => {
    if (!date) return "N/A";
    const parsedDate = parseDateSafely(date);
    return format(parsedDate, "p");
  };

  // Function to safely get client name and display fallback
  const getClientName = () => {
    return receipt?.clientName || "Client information unavailable";
  };

  // Handle print action
  const handlePrint = () => {
    setIsPrinting(true);
    
    // Simulate printing process
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
      setActionMessage({
        message: "Print request sent successfully",
        type: "success"
      });
      
      // Clear the message after 3 seconds
      setTimeout(() => setActionMessage(null), 3000);
    }, 500);
  };

  // Handle download action - Create and download a PDF
  const handleDownload = async () => {
    if (!receipt) return;
    
    setIsDownloading(true);
    
    try {
      // Generate PDF using the new function
      const pdfArrayBuffer = await generateReceiptPDF(receipt);
      
      // Convert ArrayBuffer to Blob
      const blob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
      
      // Create a download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Receipt-${receipt.receiptNumber}.pdf`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(url);
      
      setActionMessage({
        message: `Receipt #${receipt.receiptNumber} has been downloaded`,
        type: "success"
      });
    } catch (err) {
      console.error('Error generating PDF:', err);
      setActionMessage({
        message: "Failed to download receipt. Please try again.",
        type: "error"
      });
    } finally {
      setIsDownloading(false);
      
      // Clear the message after 3 seconds
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg md:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Payment Receipt #{receipt?.receiptNumber || "..."}</span>
            {receipt?.status && (
              <Badge className={getStatusStyle(receipt.status)}>
                {receipt.status === "completed" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                {receipt.status === "pending" && <AlertCircle className="h-3 w-3 mr-1" />}
                {receipt.status === "failed" && <AlertCircle className="h-3 w-3 mr-1" />}
                {receipt.status.charAt(0).toUpperCase() + receipt.status.slice(1)}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        {/* Action message display */}
        {actionMessage && (
          <div className={`py-2 px-3 mb-2 rounded-md text-sm ${
            actionMessage.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}>
            <div className="flex items-center">
              {actionMessage.type === "success" ? 
                <CheckCircle2 className="h-4 w-4 mr-2" /> : 
                <AlertCircle className="h-4 w-4 mr-2" />
              }
              {actionMessage.message}
            </div>
          </div>
        )}
        
        {isLoading ? (
          <div className="space-y-4 py-2">
            <div className="flex justify-between">
              <Skeleton className="w-40 h-8" />
              <Skeleton className="w-32 h-8" />
            </div>
            <Skeleton className="w-full h-28 mt-4" />
            <Skeleton className="w-full h-24" />
            <Skeleton className="w-3/4 h-16" />
          </div>
        ) : error ? (
          <div className="bg-destructive/10 p-6 rounded-md text-center">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-2" />
            <p className="text-destructive font-medium mb-1">{error}</p>
            <p className="text-muted-foreground text-sm mb-4">Please try again or contact support if the issue persists.</p>
            <Button onClick={fetchReceiptDetails} variant="outline" className="mr-2">
              Retry
            </Button>
            <Button onClick={onClose} variant="default">
              Close
            </Button>
          </div>
        ) : receipt ? (
          <div className="space-y-6" id="printable-receipt" ref={receiptRef}>
            {/* Receipt header with date and amount */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Payment Date:</span>
                </div>
                <div className="font-medium">
                  {formatDate(receipt.paymentDate)}
                  <span className="text-sm text-muted-foreground ml-2">
                    at {formatTime(receipt.paymentDate)}
                  </span>
                </div>
              </div>
              <div className="sm:text-right w-full sm:w-auto">
                <div className="text-sm text-muted-foreground">Amount Paid:</div>
                <div className="text-xl font-bold">
                  {formatCurrency({
                    amount: receipt.amount,
                    currency: (receipt.currency as "UGX" | "USD") || "USD",
                  })}
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Client and Invoice Info Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Client & Invoice Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-sm">Client</h3>
                    <p className="font-medium">{getClientName()}</p>
                    {receipt.clientEmail && (
                      <p className="text-sm break-all">{receipt.clientEmail}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-sm">Invoice Reference</h3>
                    {receipt.invoiceNumber ? (
                      <>
                        <p className="font-medium">Invoice #{receipt.invoiceNumber}</p>
                        <p className="text-sm text-muted-foreground">ID: {receipt.invoiceId}</p>
                      </>
                    ) : (
                      <p className="text-muted-foreground">Invoice information unavailable</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Payment Details */}
            <div>
              <h3 className="font-semibold mb-3 text-base">Payment Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-sm">
                <div className="flex justify-between sm:block">
                  <span className="text-muted-foreground">Payment Method:</span>
                  <div className="sm:mt-1">
                    <Badge className={getPaymentMethodStyle(receipt.paymentMethod)}>
                      {receipt.paymentMethod}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex justify-between sm:block">
                  <span className="text-muted-foreground">Receipt Number:</span>
                  <div className="sm:mt-1 font-mono bg-gray-100 px-2 py-0.5 rounded inline-block">
                    {receipt.receiptNumber}
                  </div>
                </div>
                
                {receipt.reference && (
                  <div className="flex justify-between sm:block col-span-1 sm:col-span-2">
                    <span className="text-muted-foreground">Reference/Transaction ID:</span>
                    <div className="sm:mt-1 font-mono bg-gray-100 px-2 py-0.5 rounded inline-block break-all">
                      {receipt.reference}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between sm:block">
                  <span className="text-muted-foreground">Receipt Generated:</span>
                  <div className="sm:mt-1">{formatDate(receipt.createdAt || receipt.paymentDate)}</div>
                </div>
              </div>
            </div>
            
            {/* Notes Section */}
            {receipt.note && (
              <div>
                <h3 className="font-semibold mb-2 text-base">Notes</h3>
                <div className="text-sm bg-muted p-4 rounded-md whitespace-pre-wrap">
                  {receipt.note}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/70" />
            <p>No receipt data available</p>
          </div>
        )}
        
        {/* Action buttons in dialog footer */}
        {receipt && (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              className="gap-1" 
              size="sm"
              onClick={handlePrint}
              disabled={isPrinting}
            >
              <Printer className="h-4 w-4" /> 
              {isPrinting ? "Printing..." : "Print"}
            </Button>
            <Button 
              variant="outline" 
              className="gap-1" 
              size="sm"
              onClick={handleDownload}
              disabled={isDownloading}
            >
              <Download className="h-4 w-4" /> 
              {isDownloading ? "Downloading..." : "Download PDF"}
            </Button>
            <Button variant="default" onClick={onClose} size="sm">
              Close
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}