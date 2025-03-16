// components/RecentReceipts.tsx
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  import { formatCurrency } from "@/app/utils/formatCurrency";
  import { getAllReceipts } from "@/app/actions";
  import Link from "next/link";
  import { CreditCard } from "lucide-react";
  import { Badge } from "@/components/ui/badge";
  
  export async function RecentReceipts() {
    const allReceipts = await getAllReceipts();
    // Get only the 5 most recent receipts
    const receipts = allReceipts.slice(0, 5);
  
    // Payment method badge styling
    const getPaymentMethodStyle = (method: string) => {
      switch (method.toLowerCase()) {
        case "cash":
          return "bg-green-100 text-green-800";
        case "bank transfer":
          return "bg-blue-100 text-blue-800";
        case "credit card":
          return "bg-purple-100 text-purple-800";
        case "mobile money":
          return "bg-orange-100 text-orange-800";
        case "check":
        case "cheque":
          return "bg-yellow-100 text-yellow-800";
        default:
          return "bg-gray-100 text-gray-800";
      }
    };
  
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-sm font-medium">Recent Payments</CardTitle>
            <CardDescription>Latest payment activity</CardDescription>
          </div>
          <Link 
            href="/dashboard/receipts" 
            className="text-xs text-blue-600 hover:underline"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {receipts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-5 text-center">
              <CreditCard className="h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">No payments yet</p>
              <Link href="/dashboard/receipts/create" className="text-xs text-blue-600 hover:underline mt-1">
                Record a payment
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {receipts.map((receipt) => (
                <div key={receipt.id} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">#{receipt.receiptNumber}</p>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${getPaymentMethodStyle(receipt.paymentMethod)}`}>
                        {receipt.paymentMethod}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {new Intl.DateTimeFormat("en-UG", {
                          month: "short",
                          day: "numeric",
                        }).format(receipt.paymentDate)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm font-medium">
                    {formatCurrency({
                      amount: receipt.amount,
                      currency: (receipt.currency as "UGX" | "USD") || "USD",
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }