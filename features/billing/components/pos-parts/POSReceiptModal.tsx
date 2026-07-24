"use client";

import React from "react";
import { usePOSContext } from "../POSBillingProvider";

export default function POSReceiptModal() {
  const { receiptToPrint, setReceiptToPrint, systemName } = usePOSContext();

  if (!receiptToPrint) return null;
  const receipt = receiptToPrint as unknown as Record<string, any>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white text-zinc-900 p-6 rounded-2xl w-full max-w-sm border border-zinc-200 shadow-2xl space-y-4 print:shadow-none print:border-none print:w-full print:p-0">
        <div className="text-center space-y-1">
          <h3 className="font-black text-base">{systemName} Receipt</h3>
          <p className="text-[11px] text-zinc-500 font-mono">ID: {receipt.id}</p>
          <p className="text-[11px] text-zinc-500 font-bold">Branch: {receipt.branchName}</p>
          <p className="text-[10px] text-zinc-400">{new Date(receipt.date).toLocaleString()}</p>
        </div>

        <div className="border-t border-b border-dashed border-zinc-300 py-3 text-xs space-y-2 font-mono">
          {(receipt.items || []).map(
            (i: { name: string; qty: number; price: number }, index: number) => (
              <div key={index} className="flex justify-between">
                <span>
                  {i.name} x{i.qty}
                </span>
                <span>${(i.price * i.qty).toFixed(2)}</span>
              </div>
            ),
          )}

          {receipt.discountPercent > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>Discount ({receipt.discountPercent}%):</span>
              <span>-${receipt.discountAmount?.toFixed(2)}</span>
            </div>
          )}

          <div className="border-t border-dashed border-zinc-300 pt-2 flex justify-between font-bold text-sm">
            <span>TOTAL:</span>
            <span>${receipt.total?.toFixed(2)}</span>
          </div>

          {receipt.paymentMethod === "cash" && receipt.cashTendered != null && (
            <div className="pt-1 text-[11px] text-zinc-600 space-y-0.5">
              <div className="flex justify-between">
                <span>Cash Tendered:</span>
                <span>${receipt.cashTendered?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-zinc-900">
                <span>Change Due:</span>
                <span>${receipt.changeDue?.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="text-center text-xs text-zinc-500 space-y-1">
          <p>Customer: {receipt.customerName || "Walk-in Customer"}</p>
          <p className="font-semibold text-zinc-700">Thank you!</p>
        </div>

        <div className="flex gap-2 print:hidden">
          <button
            onClick={() => window.print()}
            className="flex-1 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-zinc-800"
          >
            Print Receipt
          </button>
          <button
            onClick={() => setReceiptToPrint(null)}
            className="px-4 py-2 bg-zinc-100 text-zinc-700 rounded-xl text-xs font-bold cursor-pointer hover:bg-zinc-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
