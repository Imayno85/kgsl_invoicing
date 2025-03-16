// app/api/receipt/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/utils/db";
import jsPDF from "jspdf";
import { formatCurrency } from "@/app/utils/formatCurrency";
import fs from "fs/promises";
import path from "path";
import { format } from "date-fns";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const receipt = await prisma.receipt.findUnique({
      where: {
        id: params.id,
      },
      include: {
        invoice: {
          select: {
            invoiceNumber: true,
            currency: true,
            fromName: true,
            fromEmail: true,
            fromAddress: true,
            clientName: true,
            clientAddress: true,
            clientEmail: true,
            invoiceItemDescription: true,
            total: true,
          },
        },
      },
    });

    if (!receipt) {
      return new NextResponse("Receipt not found", { status: 404 });
    }

    // Initialize PDF
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "A4",
      compress: true,
    });

    // Constants for layout
    const pageWidth = 210;
    const margin = {
      left: 20,
      right: 20,
      top: 20,
      bottom: 20,
    };
    const contentWidth = pageWidth - margin.left - margin.right;
    const lineHeight = 7;
    
    // Ensure currency is a valid string
    const currency = receipt.currency || receipt.invoice.currency || "UGX";
    const currencySymbol = currency === "UGX" ? "UGX" : "USD";

    // Add font
    pdf.setFont("helvetica", "normal");

    // Helper function for formatting dates
    const formatDate = (date: Date) => {
      return format(new Date(date), "MMMM dd, yyyy");
    };

    // Helper function for drawing lines
    const drawLine = (y: number) => {
      pdf.setLineWidth(0.2);
      pdf.line(margin.left, y, pageWidth - margin.right, y);
    };

    // Logo
    try {
      const logoPath = path.join(process.cwd(), "public", "logo.png");
      const logoBuffer = await fs.readFile(logoPath);
      const logoBase64 = logoBuffer.toString("base64");
      const logoDataUri = `data:image/png;base64,${logoBase64}`;
      pdf.addImage(logoDataUri, "PNG", margin.left, margin.top, 35, 35);
    } catch (error) {
      console.error("Error loading logo:", error);
    }

    // Receipt Header
    pdf.setFontSize(24);
    pdf.setTextColor(44, 62, 80); // Dark blue-grey color
    const receiptTitle = `RECEIPT #${receipt.receiptNumber}`;
    const receiptTitleWidth = pdf.getTextWidth(receiptTitle);
    pdf.text(receiptTitle, pageWidth - margin.right - receiptTitleWidth, 40);

    // Business Information
    pdf.setFontSize(12);
    pdf.setTextColor(52, 73, 94);
    pdf.setFont("helvetica", "bold");
    pdf.text("From:", margin.left, 70);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(
      [
        receipt.invoice.fromName,
        receipt.invoice.fromEmail,
        receipt.invoice.fromAddress || "Kampala, Central Region, Uganda",
      ],
      margin.left,
      75
    );

    // Client Information
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("Received From:", margin.left, 95);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(
      [
        receipt.invoice.clientName,
        receipt.invoice.clientEmail || "",
        receipt.invoice.clientAddress || "",
      ],
      margin.left,
      100
    );

    // Receipt Details
    const detailsX = pageWidth - margin.right - 60;
    pdf.setFontSize(10);
    pdf.text(
      [
        `Receipt Date: ${formatDate(receipt.paymentDate)}`,
        `Invoice #: ${receipt.invoice.invoiceNumber}`,
        `Payment Method: ${(receipt.paymentMethod || "").replace('_', ' ')}`,
      ],
      detailsX,
      75
    );

    // Draw separator
    drawLine(115);

    // Payment Details Header
    pdf.setFillColor(241, 245, 249); // Light grey background
    pdf.rect(margin.left, 120, contentWidth, 10, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(44, 62, 80);
    pdf.text("Description", margin.left + 5, 126);
    pdf.text("Amount", pageWidth - margin.right - 5, 126, { align: "right" });

    // Item Details
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(52, 73, 94);
    let currentY = 140;

    // Add payment details
    pdf.text(`Payment for Invoice #${receipt.invoice.invoiceNumber}`, margin.left + 5, currentY);
    // Use amount property instead of amountPaid
    pdf.text(
      formatCurrency({
        amount: receipt.amount as number,
        currency: currency as "UGX" | "USD",
      })
        .toString()
        .replace("USh", currencySymbol),
      pageWidth - margin.right - 5,
      currentY,
      { align: "right" }
    );

    // Totals Section
    currentY += 20;
    drawLine(currentY);
    currentY += 10;

    pdf.setFont("helvetica", "bold");
    pdf.text("Total Paid", 140, currentY);
    // Use amount property instead of amountPaid
    pdf.text(
      formatCurrency({
        amount: receipt.amount as number,
        currency: currency as "UGX" | "USD",
      })
        .toString()
        .replace("USh", currencySymbol),
      pageWidth - margin.right - 5,
      currentY,
      { align: "right" }
    );

    // Payment Status
    currentY += 20;
    pdf.setFillColor(220, 252, 231); // Light green background for success
    pdf.rect(margin.left, currentY, contentWidth, 10, "F");
    pdf.setTextColor(22, 101, 52); // Dark green text
    pdf.text("PAID", pageWidth / 2, currentY + 6, { align: "center" });

    // Notes Section
    if (receipt.note) {
      currentY += 20;
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(44, 62, 80);
      pdf.setFontSize(10);
      pdf.text("Notes:", margin.left, currentY);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(74, 85, 104);

      // Word wrap for notes
      const splitNotes = pdf.splitTextToSize(receipt.note, contentWidth);
      pdf.text(splitNotes, margin.left, currentY + 7);
    }

    // Professional Footer
    const footerY = 275;
    drawLine(footerY);
    pdf.setFontSize(8);
    pdf.setTextColor(74, 85, 104);
    pdf.text(
      [
        "Thank you for your business",
        "Contact: +256 772 676033 | Email: info@knightguardssecurity.com | Website: www.knightguardssecurity.com",
      ],
      margin.left,
      footerY + 5
    );

    const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
      },
    });
  } catch (error) {
    console.error("Error generating receipt PDF:", error);
    return new NextResponse("Error generating receipt PDF", { status: 500 });
  }
}