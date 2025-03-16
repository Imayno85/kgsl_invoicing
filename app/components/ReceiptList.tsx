"use client";

// components/ReceiptList.tsx
import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { formatCurrency } from "@/app/utils/formatCurrency";
import { EmptyState } from "./EmptyState";
import { getAllReceipts } from "@/app/actions";
import { DeleteButton } from "./DeleteButton";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, CreditCard, Eye, FilterIcon, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ReceiptViewModal } from "./Modals/ReceiptViewModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Updated Receipt interface to match the data structure returned from API
interface Receipt {
  id: string;
  receiptNumber: string;
  paymentDate: Date | string;
  amount: number;
  currency: "UGX" | "USD"; 
  paymentMethod: string;
  reference?: string;
  // Fields coming from the invoice relationship
  invoiceId: string;
  invoiceNumber: string | number;
  clientName: string;
  clientEmail: string;
  // Other metadata
  createdAt?: Date | string;
  updatedAt?: Date | string;
  note?: string | null;
}

// Payment method badge styling
const getPaymentMethodStyle = (method: string) => {
  switch (method.toLowerCase()) {
    case "cash":
      return "bg-green-100 text-green-800 hover:bg-green-200";
    case "bank transfer":
      return "bg-blue-100 text-blue-800 hover:bg-blue-200";
    case "credit card":
      return "bg-purple-100 text-purple-800 hover:bg-purple-200";
    case "mobile money":
      return "bg-orange-100 text-orange-800 hover:bg-orange-200";
    case "check":
    case "cheque":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-200";
  }
};

export function ReceiptList() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [allReceipts, setAllReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("All Methods");
  
  // Fetch receipts on component mount
  useEffect(() => {
    const fetchReceipts = async () => {
      try {
        const data = await getAllReceipts();
        // Ensure each receipt has a createdAt value for the modal
        const processedData = data.map(receipt => ({
          ...receipt,
          createdAt: receipt.createdAt || receipt.paymentDate,
        }));
        setAllReceipts(processedData as Receipt[]);
        setReceipts(processedData as Receipt[]);
      } catch (error) {
        console.error("Failed to fetch receipts:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchReceipts();
  }, []);

  // Handle filter change
  useEffect(() => {
    if (paymentMethodFilter === "All Methods") {
      setReceipts(allReceipts);
    } else {
      const filteredReceipts = allReceipts.filter(
        receipt => receipt.paymentMethod.toLowerCase() === paymentMethodFilter.toLowerCase()
      );
      setReceipts(filteredReceipts);
    }
  }, [paymentMethodFilter, allReceipts]);

  // Handle payment method filter change
  const handleFilterChange = (value: string) => {
    setPaymentMethodFilter(value);
  };

  // Handle opening the view modal with the selected receipt
  const handleViewReceipt = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setIsViewModalOpen(true);
  };

  // Handle closing the modal
  const handleCloseModal = () => {
    setIsViewModalOpen(false);
    // Optional: reset the selected receipt after a delay
    setTimeout(() => setSelectedReceipt(null), 300);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <div className="h-8 w-8 rounded-full border-2 border-t-transparent border-gray-400 animate-spin" />
          <span className="text-gray-500">Loading receipts...</span>
        </div>
      </div>
    );
  }

  // Calculate total for filtered receipts
  const filteredTotal = receipts.reduce((sum, receipt) => sum + receipt.amount, 0);

  return (
    <>
      {allReceipts.length === 0 ? (
        <EmptyState
          title="No payment records found"
          description="Add a payment record to get started"
          buttonText="Add Receipt"
          href="/dashboard/receipts/create"
        />
      ) : (
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-600" />
                Payment Receipts
              </CardTitle>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <FilterIcon className="h-4 w-4 text-gray-500" />
                  <Select
                    value={paymentMethodFilter}
                    onValueChange={handleFilterChange}
                  >
                    <SelectTrigger className="h-9 w-40 text-sm">
                      <SelectValue placeholder="Filter by method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All Methods">All Methods</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Credit Card">Credit Card</SelectItem>
                      <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                      <SelectItem value="Check">Check</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Link href="/dashboard/receipts/create">
                  <Button size="sm" className="flex items-center gap-1">
                    <CreditCard className="h-4 w-4" /> Add Receipt
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-medium">Receipt #</TableHead>
                    <TableHead className="font-medium">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="h-4 w-4 text-gray-500" /> Date
                      </div>
                    </TableHead>
                    <TableHead className="font-medium">Amount</TableHead>
                    <TableHead className="font-medium">Method</TableHead>
                    <TableHead className="font-medium">Reference</TableHead>
                    <TableHead className="text-right font-medium">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No receipts found with the selected payment method
                      </TableCell>
                    </TableRow>
                  ) : (
                    receipts.map((receipt) => (
                      <TableRow key={receipt.id} className="hover:bg-gray-50 border-b">
                        <TableCell className="font-medium text-blue-600">
                          #{receipt.receiptNumber}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>
                              {new Intl.DateTimeFormat("en-UG", {
                                dateStyle: "medium",
                              }).format(new Date(receipt.paymentDate))}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Intl.DateTimeFormat("en-UG", {
                                timeStyle: "short",
                              }).format(new Date(receipt.paymentDate))}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency({
                            amount: receipt.amount,
                            currency: receipt.currency || "USD",
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge className={getPaymentMethodStyle(receipt.paymentMethod) + " font-normal"}>
                            {receipt.paymentMethod}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {receipt.reference ? (
                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                              {receipt.reference}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 p-0 text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                              onClick={() => handleViewReceipt(receipt)}
                              title="View Receipt"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <DeleteButton receiptId={receipt.id} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            <div className="flex justify-between items-center py-4 px-6 border-t bg-gray-50">
              <div>
                <span className="font-medium text-gray-700">
                  {paymentMethodFilter !== "All Methods" ? `${paymentMethodFilter} Total: ` : "Total Received: "}
                </span>
                <span className="font-bold text-blue-700">
                  {formatCurrency({
                    amount: filteredTotal,
                    currency: "UGX"
                  })}
                </span>
                {paymentMethodFilter !== "All Methods" && (
                  <span className="ml-2 text-gray-500 text-sm">
                    ({receipts.length} of {allReceipts.length} receipts)
                  </span>
                )}
              </div>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <FileText className="h-4 w-4" /> Export
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Make sure the selected receipt has all required fields for the modal */}
      {selectedReceipt && (
        <ReceiptViewModal 
          receiptId={selectedReceipt.id}
          open={isViewModalOpen}
          onClose={handleCloseModal}
          initialData={selectedReceipt as any}
        />
      )}
    </>
  );
}