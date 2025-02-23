import prisma from "@/app/utils/db";
import { NextResponse } from "next/server";
import jsPDF from "jspdf";
import { formatCurrency } from "@/app/utils/formatCurrency";
import fs from "fs/promises";
import path from "path";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await params;

  const data = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      invoiceName: true,
      invoiceNumber: true,
      currency: true,
      fromName: true,
      fromEmail: true,
      fromAddress: true,
      clientName: true,
      clientAddress: true,
      clientEmail: true,
      date: true,
      dueDate: true,
      invoiceItemDescription: true,
      invoiceItemQuantity: true,
      invoiceItemRate: true,
      total: true,
      note: true,
    },
  });

  if (!data) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // Initialize PDF with better default settings
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "A4",
    compress: true,
  });

  // Constants for better layout management
  const pageWidth = 210;
  const margin = {
    left: 20,
    right: 20,
    top: 20,
    bottom: 20,
  };
  const contentWidth = pageWidth - margin.left - margin.right;
  const lineHeight = 7;
  const currencySymbol = data.currency === "UGX" ? "UGX" : "USD";

  // Add custom font
  pdf.setFont("helvetica", "normal");

  // Helper function for formatting dates
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-UG", {
      dateStyle: "long",
    }).format(date);
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

  // Header Section with improved positioning
  pdf.setFontSize(24);
  pdf.setTextColor(44, 62, 80); // Dark blue-grey color
  const invoiceTitle = `INVOICE #${data.invoiceNumber}`;
  const invoiceTitleWidth = pdf.getTextWidth(invoiceTitle);
  pdf.text(invoiceTitle, pageWidth - margin.right - invoiceTitleWidth, 40);

  // Business Information Section with bold "From:"
  pdf.setFontSize(12);
  pdf.setTextColor(52, 73, 94); // Slightly lighter blue-grey
  pdf.setFont("helvetica", "bold");
  pdf.text("From:", margin.left, 70);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(
    [
      data.fromName,
      data.fromEmail,
      data.fromAddress || "Kampala, Central Region, Uganda",
    ],
    margin.left,
    75
  );

  // Client Information with bold "Bill To:"
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text("Bill To:", margin.left, 95);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(
    [data.clientName, data.clientEmail, data.clientAddress],
    margin.left,
    100
  );

  // Invoice Details with better alignment
  const detailsX = pageWidth - margin.right - 60;
  pdf.text(
    [
      `Date: ${formatDate(data.date)}`,
      `Due Date: Net ${data.dueDate}`,
      `Currency: ${currencySymbol}`,
    ],
    detailsX,
    75
  );

  // Draw separator
  drawLine(115);

  // Table Headers with improved styling
  pdf.setFillColor(241, 245, 249); // Light grey background
  pdf.rect(margin.left, 120, contentWidth, 10, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(44, 62, 80);
  pdf.text("Description", margin.left + 5, 126);
  pdf.text("Qty", 110, 126, { align: "right" });
  pdf.text("Rate", 140, 126, { align: "right" });
  pdf.text("Amount", pageWidth - margin.right - 5, 126, { align: "right" });

  // Item Details
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(52, 73, 94);
  let currentY = 140;

  // Add item with proper formatting
  pdf.text(data.invoiceItemDescription, margin.left + 5, currentY);
  pdf.text(data.invoiceItemQuantity.toString(), 110, currentY, {
    align: "right",
  });
  pdf.text(
    formatCurrency({
      amount: data.invoiceItemRate,
      currency: data.currency as "UGX" | "USD",
    })
      .toString()
      .replace("USh", currencySymbol),
    140,
    currentY,
    { align: "right" }
  );
  pdf.text(
    formatCurrency({
      amount: data.total,
      currency: data.currency as "UGX" | "USD",
    })
      .toString()
      .replace("USh", currencySymbol),
    pageWidth - margin.right - 5,
    currentY,
    { align: "right" }
  );

  // Totals Section with better styling
  currentY += 20;
  drawLine(currentY);
  currentY += 10;

  pdf.setFont("helvetica", "bold");
  pdf.text("Total", 140, currentY);
  pdf.text(
    formatCurrency({
      amount: data.total,
      currency: data.currency as "UGX" | "USD",
    })
      .toString()
      .replace("USh", currencySymbol),
    pageWidth - margin.right - 5,
    currentY,
    { align: "right" }
  );

  // Notes Section with better formatting
  if (data.note) {
    currentY += 20;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text("Notes:", margin.left, currentY);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(74, 85, 104); // Softer text color for notes

    // Word wrap for notes
    const splitNotes = pdf.splitTextToSize(data.note, contentWidth);
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
      "Payment Terms: Net " + data.dueDate,
      "Contact: +256 [Your Phone Number] | Email: [Your Email] | Website: [Your Website]",
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
}
