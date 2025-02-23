import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvatarFallback } from "@radix-ui/react-avatar";
import prisma from "../utils/db";
import { requireUser } from "../utils/hooks";
import { formatCurrency } from "../utils/formatCurrency";

async function getData(userId: string) {
  const data = await prisma.invoice.findMany({
    where: {
      userId: userId,
    },
    select: {
      id: true,
      clientName: true,
      clientEmail: true,
      total: true,
      currency: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 7,
  });
  return data;
}

export async function RecentInvoices() {
  const session = await requireUser();
  const data = await getData(session.user?.id as string);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Invoices</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {data.map((item) => (
          <div className="grid grid-cols-[auto_minmax(100px,1fr)_auto] items-center gap-4" key={item.id}>
            <Avatar className="hidden sm:flex size-9">
              <AvatarFallback>{item.clientName.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <p className="text-sm font-medium leading-none truncate">
                {item.clientName}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {item.clientEmail}
              </p>
            </div>
            <div className="font-medium whitespace-nowrap justify-self-end text-xs lg:text-sm">
              +{formatCurrency({
                amount: item.total,
                currency: item.currency as any,
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}