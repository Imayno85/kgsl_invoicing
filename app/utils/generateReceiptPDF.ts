import jsPDF from "jspdf";
import { formatCurrency } from "@/app/utils/formatCurrency";
import { format } from "date-fns";

interface Receipt {
  id: string;
  receiptNumber: string;
  invoiceId: string;
  invoiceNumber?: string | number;
  clientName?: string;
  clientEmail?: string;
  clientAddress?: string;
  amount: number;
  currency: "UGX" | "USD";
  paymentDate: Date | string;
  paymentMethod: string;
  reference?: string;
  note?: string | null;
  fromName?: string;
  fromEmail?: string;
  fromAddress?: string;
  status?: "completed" | "pending" | "failed";
  createdAt?: Date | string;
}

export async function generateReceiptPDF(receipt: Receipt): Promise<Uint8Array> {
  try {
    // Initialize PDF with better default settings
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "A4",
      compress: true,
    });

    // Constants for better layout management
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = {
      left: 20,
      right: 20,
      top: 20,
      bottom: 20,
    };
    const contentWidth = pageWidth - margin.left - margin.right;
    const lineHeight = 7;
    const currencySymbol = receipt.currency === "UGX" ? "UGX" : "$";

    // Add custom font
    pdf.setFont("helvetica", "normal");

    // Helper function for formatting dates
    const formatDate = (date: Date | string) => {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      return format(dateObj, "MMMM dd, yyyy");
    };

    const formatTime = (date: Date | string) => {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      return format(dateObj, "h:mm a");
    };

    // Helper function for drawing lines
    const drawLine = (y: number, width = 0.2) => {
      pdf.setLineWidth(width);
      pdf.line(margin.left, y, pageWidth - margin.right, y);
    };

    // Logo - using public URL instead of file system
    try {
      // Use a public URL for the logo instead of reading from filesystem
      const logoUrl = '/logo.png'; // Assuming logo is in the public directory
      pdf.addImage(logoUrl, "PNG", margin.left, margin.top, 35, 35);
    } catch (error) {
      console.error("Error loading logo:", error);
      // Continue without logo rather than failing the whole PDF generation
    }

    // Header Section with improved positioning
    pdf.setFontSize(24);
    pdf.setTextColor(44, 62, 80); // Dark blue-grey color
    const receiptTitle = `RECEIPT #${receipt.receiptNumber}`;
    const receiptTitleWidth = pdf.getTextWidth(receiptTitle);
    pdf.text(receiptTitle, pageWidth - margin.right - receiptTitleWidth, margin.top + 15);

    // Status badge
    if (receipt.status) {
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      
      const status = receipt.status.toUpperCase();
      const statusWidth = pdf.getTextWidth(status) + 16;
      const statusY = margin.top + 30;
      
      // Set color based on status
      const statusColors = {
        completed: { bg: [39, 174, 96], text: [255, 255, 255] },
        pending: { bg: [243, 156, 18], text: [255, 255, 255] },
        failed: { bg: [231, 76, 60], text: [255, 255, 255] }
      };
      
      const color = statusColors[receipt.status as keyof typeof statusColors] || 
                    statusColors.pending;
      
      // Draw status background
      pdf.setFillColor(color.bg[0], color.bg[1], color.bg[2]);
      pdf.roundedRect(
        pageWidth - margin.right - statusWidth, 
        statusY, 
        statusWidth, 
        8, 
        2, 
        2, 
        'F'
      );
      
      // Draw status text
      pdf.setTextColor(color.text[0], color.text[1], color.text[2]);
      pdf.text(
        status, 
        pageWidth - margin.right - statusWidth + 8, 
        statusY + 5.5
      );
    }

    // Company Information Section
    let yPosition = 70;
    pdf.setFontSize(12);
    pdf.setTextColor(52, 73, 94);
    pdf.setFont("helvetica", "bold");
    pdf.text("From:", margin.left, yPosition);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(
      [
        receipt.fromName || "Knight Guards Security Ltd",
        receipt.fromEmail || "info@knightguardssecurity.com",
        receipt.fromAddress || "P.O. Box 7153, Kampala, Uganda",
      ],
      margin.left,
      yPosition + 5
    );

    // Client Information Section
    yPosition += 25;
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("Client:", margin.left, yPosition);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(
      [
        receipt.clientName || "N/A", 
        receipt.clientEmail || "", 
        receipt.clientAddress || ""
      ].filter(Boolean),
      margin.left,
      yPosition + 5
    );

    // Payment Details with better alignment
    yPosition = 70;
    const detailsX = pageWidth - margin.right - 80;
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("Payment Date:", detailsX, yPosition);
    pdf.setFont("helvetica", "normal");
    pdf.text(formatDate(receipt.paymentDate), detailsX + 30, yPosition);
    
    yPosition += 7;
    pdf.setFont("helvetica", "bold");
    pdf.text("Payment Time:", detailsX, yPosition);
    pdf.setFont("helvetica", "normal");
    pdf.text(formatTime(receipt.paymentDate), detailsX + 30, yPosition);
    
    yPosition += 7;
    pdf.setFont("helvetica", "bold");
    pdf.text("Method:", detailsX, yPosition);
    pdf.setFont("helvetica", "normal");
    pdf.text(receipt.paymentMethod, detailsX + 30, yPosition);
    
    if (receipt.reference) {
      yPosition += 7;
      pdf.setFont("helvetica", "bold");
      pdf.text("Reference:", detailsX, yPosition);
      pdf.setFont("helvetica", "normal");
      pdf.text(receipt.reference, detailsX + 30, yPosition);
    }
    
    yPosition += 7;
    pdf.setFont("helvetica", "bold");
    pdf.text("Currency:", detailsX, yPosition);
    pdf.setFont("helvetica", "normal");
    pdf.text(currencySymbol, detailsX + 30, yPosition);

    // Draw separator before payment info
    yPosition = 115;
    drawLine(yPosition, 0.5);
    yPosition += 15;

    // Payment Information Section
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(44, 62, 80);
    pdf.text("PAYMENT INFORMATION", margin.left, yPosition);
    yPosition += 10;

    // Create a payment info box with light background
    pdf.setFillColor(245, 247, 250);
    pdf.roundedRect(margin.left, yPosition, contentWidth, 40, 3, 3, 'F');

    // Invoice Reference
    pdf.setFontSize(10);
    pdf.setTextColor(52, 73, 94);
    
    const invoiceColX = margin.left + 10;
    let invoiceRowY = yPosition + 15;
    
    pdf.setFont("helvetica", "bold");
    pdf.text("Invoice Number:", invoiceColX, invoiceRowY);
    pdf.setFont("helvetica", "normal");
    pdf.text(
      receipt.invoiceNumber ? `#${receipt.invoiceNumber}` : "N/A", 
      invoiceColX + 35, 
      invoiceRowY
    );
    
    invoiceRowY += 10;
    pdf.setFont("helvetica", "bold");
    pdf.text("Invoice ID:", invoiceColX, invoiceRowY);
    pdf.setFont("helvetica", "normal");
    pdf.text(receipt.invoiceId, invoiceColX + 35, invoiceRowY);

    // Payment Amount (highlighted)
    const amountX = pageWidth - margin.right - 70;
    const amountY = yPosition + 15;
    
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("Amount Paid:", amountX, amountY);
    
    // Format the amount with the proper currency
    let formattedAmount;
    if (receipt.currency === "UGX") {
      formattedAmount = `${currencySymbol} ${receipt.amount.toLocaleString()}`;
    } else {
      formattedAmount = formatCurrency({
        amount: receipt.amount,
        currency: receipt.currency,
      }).replace("USh", currencySymbol);
    }
    
    // Display the amount in larger, highlighted text
    pdf.setFontSize(16);
    pdf.setTextColor(41, 128, 185); // Blue for emphasis
    pdf.setFont("helvetica", "bold");
    pdf.text(formattedAmount, amountX, amountY + 10);

    // Notes Section if available
    yPosition += 50;
    if (receipt.note) {
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(44, 62, 80);
      pdf.text("NOTES", margin.left, yPosition);
      
      yPosition += 7;
      drawLine(yPosition, 0.2);
      yPosition += 10;
      
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(74, 85, 104);
      
      // Word wrap for notes
      const splitNotes = pdf.splitTextToSize(receipt.note, contentWidth);
      pdf.text(splitNotes, margin.left, yPosition);
      
      // Adjust position based on note length
      yPosition += splitNotes.length * 5 + 10;
    }

    // QR Code placeholder (can be implemented with actual QR code in production)
    const qrSize = 30;
    const qrX = pageWidth - margin.right - qrSize;
    const qrY = yPosition;
    
    // Simple empty box for scan verification
    pdf.setDrawColor(200, 200, 200);
    pdf.setFillColor(245, 247, 250);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(qrX, qrY, qrSize, qrSize, 2, 2, 'FD');
    
    pdf.setFontSize(7);
    pdf.setTextColor(100, 100, 100);
    pdf.text("Scan to verify", qrX + (qrSize - pdf.getTextWidth("Scan to verify")) / 2, qrY + qrSize + 5);

    // Thank You message
    const thankYouY = qrY + qrSize + 20;
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(41, 128, 185);
    const thankYouText = "Thank You For Your Business";
    const thankYouWidth = pdf.getTextWidth(thankYouText);
    pdf.text(thankYouText, (pageWidth - thankYouWidth) / 2, thankYouY);

    // Professional Footer
    const footerY = 270;
    drawLine(footerY, 0.2);
    pdf.setFontSize(8);
    pdf.setTextColor(74, 85, 104);
    pdf.text(
      [
        "Payment terms: This receipt confirms full payment for the above listed invoice.",
        `Generated on ${formatDate(receipt.createdAt || new Date())} at ${formatTime(receipt.createdAt || new Date())}`,
        "Contact: +256 772 676033 | Email: info@knightguardssecurity.com | Website: www.knightguardssecurity.com",
      ],
      margin.left,
      footerY + 5
    );

    // Convert to buffer
    const pdfBuffer = pdf.output('arraybuffer');
    return new Uint8Array(pdfBuffer);

  } catch (error) {
    console.error("Error generating receipt PDF:", error);
    throw new Error("Failed to generate receipt PDF");
  }
}