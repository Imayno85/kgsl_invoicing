import React from 'react';
import { formatCurrency } from '../utils/formatCurrency';

type InvoicePaymentSummaryProps = {
  total: number;
  paidAmount: number;
  currency: string;
  status: string;
};

export function InvoicePaymentSummary({ 
  total, 
  paidAmount = 0, 
  currency, 
  status 
}: InvoicePaymentSummaryProps) {
  const remainingAmount = total - paidAmount;
  const paymentPercentage = total > 0 ? Math.round((paidAmount / total) * 100) : 0;
  
  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <h3 className="font-medium text-lg mb-2">Payment Summary</h3>
      
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>Total Amount:</div>
        <div className="text-right font-medium">
          {formatCurrency({ amount: total, currency: currency as "UGX" | "USD" })}
        </div>
        
        <div>Amount Paid:</div>
        <div className="text-right font-medium text-green-600">
          {formatCurrency({ amount: paidAmount, currency: currency as "UGX" | "USD" })}
        </div>
        
        {status !== "PAID" && (
          <>
            <div>Remaining Balance:</div>
            <div className="text-right font-medium text-amber-600">
              {formatCurrency({ amount: remainingAmount, currency: currency as "UGX" | "USD" })}
            </div>
          </>
        )}
      </div>
      
      {/* Progress bar for payment completion */}
      <div className="mt-4">
        <div className="flex justify-between text-sm mb-1">
          <span>Payment Progress</span>
          <span>{paymentPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className={`h-2.5 rounded-full ${status === "PAID" ? "bg-green-600" : "bg-amber-500"}`} 
            style={{ width: `${paymentPercentage}%` }}>
          </div>
        </div>
      </div>
      
      <div className="mt-4 text-center">
        <span 
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
            ${status === "PAID" ? "bg-green-100 text-green-800" : 
              status === "PARTIALLY_PAID" ? "bg-amber-100 text-amber-800" : 
              "bg-gray-100 text-gray-800"}`}>
          {status === "PAID" ? "Paid" : 
           status === "PARTIALLY_PAID" ? "Partially Paid" : 
           status}
        </span>
      </div>
    </div>
  );
}