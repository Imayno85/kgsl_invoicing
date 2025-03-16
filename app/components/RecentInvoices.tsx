import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
          <div className="grid grid-cols-[2rem_1fr_auto] items-center gap-4 w-full" key={item.id}>
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-xs font-medium">
              {item.clientName.slice(0, 2)}
            </div>
            <div className="flex flex-col w-full overflow-hidden">
              <p className="text-sm font-medium leading-none truncate">
                {item.clientName}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {item.clientEmail}
              </p>
            </div>
            <div className="font-medium whitespace-nowrap flex-shrink-0 text-xs lg:text-sm">
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