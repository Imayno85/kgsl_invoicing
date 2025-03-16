// app/dashboard/receipts/page.tsx

import { ReceiptList } from "@/app/components/ReceiptList";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

export default function ReceiptsRoute() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">Payment Records</CardTitle>
            <CardDescription>Manage your payment records right here</CardDescription>
          </div>
          <Link href="/dashboard/receipts/create" className={buttonVariants()}>
            <PlusIcon />
            Add Receipt
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<Skeleton className="w-full h-[500px]" />}>
          <ReceiptList />
        </Suspense>
      </CardContent>
    </Card>
  );
}