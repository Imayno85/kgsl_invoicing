export async function checkAndUpdateOverdueInvoices() {
    try {
      const today = new Date();
      
      // Find all pending invoices where due date has passed
      const overdueInvoices = await prisma.invoice.findMany({
        where: {
          status: {
            in: ["PENDING", "PARTIALLY_PAID"]
          },
          dueDate: {
            lt: today
          }
        }
      });
      
      // Update their status to OVERDUE
      if (overdueInvoices.length > 0) {
        await prisma.invoice.updateMany({
          where: {
            id: {
              in: overdueInvoices.map(inv => inv.id)
            }
          },
          data: {
            status: "OVERDUE"
          }
        });
        
        console.log(`Updated ${overdueInvoices.length} invoices to OVERDUE status`);
      }
      
      return {
        processed: overdueInvoices.length
      };
    } catch (error) {
      console.error("Error updating overdue invoices:", error);
      throw error;
    }
  }