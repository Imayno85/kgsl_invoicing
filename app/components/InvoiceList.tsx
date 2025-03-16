import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InvoiceActions } from "./InvoiceActions";
import prisma from "../utils/db";
import { requireUser } from "../utils/hooks";
import { formatCurrency } from "../utils/formatCurrency";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "./EmptyState";
import { CalendarIcon, ArrowDownIcon, ArrowUpIcon } from "lucide-react";

// Status badge variant mapping for your specific enum values
const getStatusVariant = (status: string) => {
  switch (status.toUpperCase()) {
    case "PAID":
      return "bg-green-100 text-green-800 hover:bg-green-200";
    case "PENDING":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
    case "OVERDUE":
      return "bg-red-100 text-red-800 hover:bg-red-200";
    case "DRAFT":
      return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    case "PARTIALLY_PAID":
      return "bg-blue-100 text-blue-800 hover:bg-blue-200";
    case "CANCELLED":
      return "bg-purple-100 text-purple-800 hover:bg-purple-200";
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-200";
  }
};

// Format status display text to be more user-friendly
const formatStatusDisplay = (status: string) => {
  switch (status.toUpperCase()) {
    case "PARTIALLY_PAID":
      return "Partially Paid";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }
};

async function getData(userId: string) {
  const data = await prisma.invoice.findMany({
    where: {
      userId: userId,
    },
    select: {
      id: true,
      clientName: true,
      total: true,
      createdAt: true,
      paidAmount: true,
      status: true,
      invoiceNumber: true,
      currency: true,
      dueDate: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return data;
}

export async function InvoiceList() {
  const session = await requireUser();
  const data = await getData(session.user?.id as string);
  
  // Calculate overdue status for visual indicators
  const today = new Date();
  const dataWithOverdueStatus = data.map(invoice => {
    return {
      ...invoice,
      isOverdue: invoice.status.toUpperCase() !== 'PAID' && 
                invoice.dueDate && new Date(invoice.dueDate) < today
    };
  });

  return (
    <>
      {data.length === 0 ? (
        <EmptyState
          title="No invoices found"
          description="Create an invoice to get started"
          buttonText="Create Invoice"
          href="/dashboard/invoices/create"
        />
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Invoices ({data.length})</h2>
            <div className="flex items-center gap-2">
              <select className="text-sm border rounded-md p-1">
                <option>All Statuses</option>
                <option>Paid</option>
                <option>Pending</option>
                <option>Overdue</option>
                <option>Draft</option>
                <option>Partially Paid</option>
                <option>Cancelled</option>
              </select>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-medium">Invoice ID</TableHead>
                  <TableHead className="font-medium">Customer</TableHead>
                  <TableHead className="font-medium">Amount</TableHead>
                  <TableHead className="font-medium">Balance</TableHead>
                  <TableHead className="font-medium">Status</TableHead>
                  <TableHead className="font-medium">
                    <div className="flex items-center gap-1">
                      Date <CalendarIcon className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right font-medium">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataWithOverdueStatus.map((invoice) => (
                  <TableRow 
                    key={invoice.id}
                    className={invoice.isOverdue && invoice.status.toUpperCase() !== 'OVERDUE' ? "bg-red-50" : "hover:bg-gray-50"}
                  >
                    <TableCell className="font-medium">#{invoice.invoiceNumber}</TableCell>
                    <TableCell>{invoice.clientName}</TableCell>
                    <TableCell>
                      {formatCurrency({
                        amount: invoice.total,
                        currency: invoice.currency as "UGX" | "USD",
                      })}
                    </TableCell>
                    <TableCell>
                      <span className={invoice.total - (invoice.paidAmount || 0) > 0 ? "text-red-600" : "text-green-600"}>
                        {formatCurrency({
                          amount: invoice.total - (invoice.paidAmount || 0),
                          currency: invoice.currency as "UGX" | "USD",
                        })}
                      </span>
                    </TableCell>
                    
                    <TableCell>
                      <Badge className={getStatusVariant(invoice.status)}>
                        {formatStatusDisplay(invoice.status)}
                      </Badge>
                      {invoice.isOverdue && invoice.status.toUpperCase() !== 'OVERDUE' && (
                        <span className="ml-2 text-xs text-red-600 font-medium">Overdue</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span>
                          {new Intl.DateTimeFormat("en-UG", {
                            dateStyle: "medium",
                          }).format(invoice.createdAt)}
                        </span>
                        {invoice.dueDate && (
                          <span className={`text-xs ${new Date(invoice.dueDate) < today && invoice.status.toUpperCase() !== 'PAID' ? "text-red-500" : "text-gray-500"}`}>
                            Due: {new Intl.DateTimeFormat("en-UG", {
                              dateStyle: "medium",
                            }).format(new Date(invoice.dueDate))}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <InvoiceActions id={invoice.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex justify-between items-center text-sm text-gray-600 pt-2">
            <div>
              <span className="font-medium">Total Outstanding: </span>
              {formatCurrency({
                amount: data.reduce((sum, invoice) => 
                  (invoice.status.toUpperCase() !== 'PAID' && invoice.status.toUpperCase() !== 'CANCELLED') ? 
                  sum + (invoice.total - (invoice.paidAmount || 0)) : sum, 0),
                currency: "UGX"
              })}
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 border rounded hover:bg-gray-50">Export</button>
              <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
                + New Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}