import { Suspense } from "react";
import { DashboardBlocks } from "../components/DashboardBlocks";
import { EmptyState } from "../components/EmptyState";
import { InvoiceGraph } from "../components/InvoiceGraph";
import { RecentInvoices } from "../components/RecentInvoices";

import prisma from "../utils/db";
import { requireUser } from "../utils/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, DollarSign, TrendingUp, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "../utils/formatCurrency";
import { RecentReceipts } from "../components/RecentReceipts";

async function getData(userId: string) {
  // Get invoices data
  const invoices = await prisma.invoice.findMany({
    where: {
      userId: userId,
    },
    select: {
      id: true,
      total: true,
      status: true,
      paidAmount: true,
      currency: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Get receipts data
  const receipts = await prisma.receipt.findMany({
    where: {
      invoice: {
        userId: userId
      }
    },
    select: {
      id: true,
      amount: true,
      currency: true,
      paymentDate: true,
    },
    orderBy: {
      paymentDate: "desc",
    },
  });

  // Calculate summary statistics
  const totalInvoiced = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const totalReceived = receipts.reduce((sum, receipt) => sum + receipt.amount, 0);
  const totalOutstanding = invoices.reduce((sum, invoice) => {
    if (invoice.status.toUpperCase() !== 'PAID' && invoice.status.toUpperCase() !== 'CANCELLED') {
      return sum + (invoice.total - (invoice.paidAmount || 0));
    }
    return sum;
  }, 0);

  const overdueInvoices = invoices.filter(invoice => 
    invoice.status.toUpperCase() === 'OVERDUE' || 
    (invoice.status.toUpperCase() !== 'PAID' && 
     invoice.status.toUpperCase() !== 'CANCELLED' && 
     new Date(invoice.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000 < Date.now())
  ).length;

  return {
    invoices,
    receipts,
    summary: {
      totalInvoiced,
      totalReceived,
      totalOutstanding,
      totalInvoices: invoices.length,
      totalReceipts: receipts.length,
      overdueInvoices
    }
  };
}

export default async function DashboardRoute() {
  const session = await requireUser();
  const data = await getData(session.user?.id as string);
  const { invoices, receipts, summary } = data;
  const hasData = invoices.length > 0 || receipts.length > 0;

  return (
    <>
      {!hasData ? (
        <EmptyState
          title="No data found"
          description="Create invoices or add payment records to get started"
          buttonText="Create Invoice"
          href="/dashboard/invoices/create"
        />
      ) : (
        <Suspense fallback={<Skeleton className="w-full h-full flex-1"/>}>
          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency({
                    amount: summary.totalInvoiced,
                    currency: "UGX"
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  From {summary.totalInvoices} invoices
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Received</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency({
                    amount: summary.totalReceived,
                    currency: "UGX"
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  From {summary.totalReceipts} payments
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {formatCurrency({
                    amount: summary.totalOutstanding,
                    currency: "UGX"
                  })}
                </div>
                <div className="flex items-center pt-1">
                  <span className="text-xs text-muted-foreground">
                    {((summary.totalReceived / (summary.totalInvoiced || 1)) * 100).toFixed(1)}% collection rate
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <Card className={summary.overdueInvoices > 0 ? "border-red-200 bg-red-50" : ""}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue Invoices</CardTitle>
                <ArrowUpRight className={`h-4 w-4 ${summary.overdueInvoices > 0 ? "text-red-500" : "text-muted-foreground"}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${summary.overdueInvoices > 0 ? "text-red-600" : ""}`}>
                  {summary.overdueInvoices}
                </div>
                {summary.overdueInvoices > 0 ? (
                  <div className="flex items-center pt-1">
                    <Link href="/dashboard/invoices" className="text-xs text-red-600 hover:underline">
                      Action required
                    </Link>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    All invoices up to date
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Custom Dashboard Blocks (if you want to keep them) */}
          {/* <DashboardBlocks /> */}
          
          {/* Tabs for different views */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-3 md:gap-8">
                <div className="lg:col-span-2">
                  <InvoiceGraph />
                </div>
                <div className="space-y-4">
                  <RecentInvoices />
                  <RecentReceipts />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="invoices">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Pending Invoices</CardTitle>
                    <CardDescription>Invoices awaiting payment</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Content for pending invoices */}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Invoices</CardTitle>
                    <CardDescription>Latest invoice activity</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RecentInvoices />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Invoice Analytics</CardTitle>
                    <CardDescription>Performance metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Content for invoice analytics */}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="payments">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Payments</CardTitle>
                    <CardDescription>Latest payment activity</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RecentReceipts />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Methods</CardTitle>
                    <CardDescription>Breakdown by method</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Content for payment methods */}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Collection Rate</CardTitle>
                    <CardDescription>Payment performance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Content for collection rate */}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </Suspense>
      )}
    </>
  );
}