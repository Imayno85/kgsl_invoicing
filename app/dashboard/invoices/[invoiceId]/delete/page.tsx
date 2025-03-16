import prisma from "@/app/utils/db";
import { requireUser } from "@/app/utils/hooks";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { redirect } from "next/navigation";
import WarningGif from "@/public/warning-gif.gif";
import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { SubmitButton } from "@/app/components/SubmitButtons";
import { DeleteInvoice } from "@/app/actions";

async function Authorize(invoiceId: string, userId: string) {
  const data = await prisma.invoice.findUnique({
    where: {
      id: invoiceId,
    },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!data || data.userId !== userId) {
    return redirect("/dashboard/invoices");
  }
  
  return data;
}

type Params = Promise<{ invoiceId: string }>;

export default async function DeleteInvoiceRoute({
  params,
}: {
  params: Params;
}) {
  const session = await requireUser();
  const { invoiceId } = await params;
  await Authorize(invoiceId, session.user?.id as string);

  async function handleDelete() {
    "use server";

    const result = await DeleteInvoice(invoiceId);
    
    if (result.error) {
      // You could handle errors differently if needed
      console.error(result.error);
    }
    
    // Redirect regardless to avoid showing error to users
    // You might want to improve this with better error handling
    redirect("/dashboard/invoices");
  }

  return (
    <div className="flex flex-1 justify-center items-center">
      <Card className="max-w-[500px]">
        <CardHeader>
          <CardTitle>Delete Invoice</CardTitle>
          <CardDescription>
            Are you sure you want to delete this invoice?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Image 
            src={WarningGif} 
            alt="Warning Gif" 
            className="rounded-lg"
            unoptimized // Add this to fix the animation warning
          />
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          <Link
            className={buttonVariants({ variant: "outline" })}
            href="/dashboard/invoices"
          >
            Cancel
          </Link>
          <form action={handleDelete}>
            <SubmitButton text="Delete Invoice" variant={"destructive"} />
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}