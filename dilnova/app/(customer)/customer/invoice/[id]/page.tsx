import { auth, currentUser } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCheckoutOptionsCatalog } from '@/utils/checkoutOptions';
import { describeOrderCheckout } from '@/utils/checkoutOptionsShared';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoicePage({ params }: PageProps) {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) {
    redirect('/unauthorized');
  }

  const { id } = await params;
  const userEmail = user.emailAddresses[0]?.emailAddress || '';

  // Retrieve the order
  const [order] = await db
    .select()
    .from(schema.simulatedOrders)
    .where(eq(schema.simulatedOrders.id, id))
    .limit(1);

  // Authorization check: Make sure order exists and email matches
  if (!order || order.customerEmail !== userEmail) {
    notFound();
  }

  const [items, checkoutOptionsCatalog, pickupBranch] = await Promise.all([
    db
      .select()
      .from(schema.simulatedOrderItems)
      .where(eq(schema.simulatedOrderItems.orderId, id)),
    getCheckoutOptionsCatalog(),
    order.pickupBranchId
      ? db
          .select({ name: schema.branches.name })
          .from(schema.branches)
          .where(eq(schema.branches.id, order.pickupBranchId))
          .limit(1)
          .then((rows) => rows[0]?.name ?? null)
      : Promise.resolve(null),
  ]);

  const checkoutDetails = describeOrderCheckout(
    {
      ...order,
      pickupBranchName: pickupBranch,
    },
    checkoutOptionsCatalog
  );

  const subtotal = order.totalAmount;
  const tax = subtotal * 0.08;
  const grandTotal = subtotal + tax;

  const formatPrice = (cents: number) => {
    return (cents / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  };

  const invoiceDate = new Date(order.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-8 md:p-12 font-sans text-zinc-900 dark:text-zinc-150 print:bg-white print:text-black print:p-0">
      {/* Control panel - hidden on printing */}
      <div className="max-w-3xl mx-auto mb-8 flex items-center justify-between gap-4 print:hidden border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <Link
          href="/customer?tab=orders"
          className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 flex items-center gap-1"
        >
          &larr; Back to Portal
        </Link>
        <a
          href="javascript:window.print()"
          className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer text-center"
        >
          🖨️ Print Invoice
        </a>
      </div>

      {/* Invoice Sheet */}
      <div className="max-w-3xl mx-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-10 shadow-lg print:shadow-none print:border-none print:bg-white print:p-0 print:dark:bg-white">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-8 border-b border-zinc-150 dark:border-zinc-800">
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase text-purple-700 dark:text-purple-400 print:text-black">
              DILNOVA HUB
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Enterprise Commerce & Multi-Vendor Sandbox System
            </p>
          </div>
          <div className="text-left sm:text-right font-mono text-xs text-zinc-500 dark:text-zinc-400 space-y-1">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 print:text-black">INVOICE</h2>
            <p>Invoice #: INV-{order.id.slice(0, 8).toUpperCase()}</p>
            <p>Date: {invoiceDate}</p>
            <p>Status: <span className="uppercase font-bold">{order.status}</span></p>
          </div>
        </div>

        {/* Bill to section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-8 text-xs">
          <div>
            <h3 className="font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Billed To:</h3>
            <p className="font-bold text-zinc-900 dark:text-zinc-100 print:text-black">{order.customerName}</p>
            <p className="text-zinc-500 dark:text-zinc-400 mt-0.5">{order.customerEmail}</p>
          </div>
          <div className="sm:text-right">
            <h3 className="font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Issued By:</h3>
            <p className="font-bold text-zinc-900 dark:text-zinc-100 print:text-black">Dilnova Registry Service</p>
            <p className="text-zinc-500 dark:text-zinc-400 mt-0.5">Automated Simulated Register checkout</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-8 text-xs border-b border-zinc-150 dark:border-zinc-800">
          <div>
            <h3 className="font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Fulfillment</h3>
            <p className="font-semibold text-zinc-900 dark:text-zinc-100 print:text-black">{checkoutDetails.fulfillment}</p>
          </div>
          <div>
            <h3 className="font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Payment</h3>
            <p className="font-semibold text-zinc-900 dark:text-zinc-100 print:text-black">{checkoutDetails.payment}</p>
          </div>
          {checkoutDetails.pickup && (
            <div>
              <h3 className="font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Pickup Branch</h3>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100 print:text-black">{checkoutDetails.pickup}</p>
            </div>
          )}
        </div>

        {/* Table of items */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-1">Product Description</th>
                <th className="py-3 px-1 text-center">Qty</th>
                <th className="py-3 px-1 text-right">Unit Price</th>
                <th className="py-3 px-1 text-right">Total Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {items.map((item) => (
                <tr key={item.id} className="text-zinc-800 dark:text-zinc-200 print:text-black">
                  <td className="py-4 px-1">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 print:text-black block">{item.productName}</span>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Vendor ID: {item.vendorOrgId.slice(0, 8)}</span>
                  </td>
                  <td className="py-4 px-1 text-center font-mono">{item.quantity}</td>
                  <td className="py-4 px-1 text-right font-mono">{formatPrice(item.unitPrice)}</td>
                  <td className="py-4 px-1 text-right font-mono font-bold">{formatPrice(item.unitPrice * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Block */}
        <div className="flex justify-end pt-6">
          <div className="w-full sm:w-64 space-y-2 text-xs font-mono text-zinc-600 dark:text-zinc-400 print:text-black">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-100 print:text-black">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Estimated Tax (8%):</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-100 print:text-black">{formatPrice(tax)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-zinc-900 dark:text-zinc-100 print:text-black border-t border-zinc-200 dark:border-zinc-850 pt-2">
              <span>Total Amount:</span>
              <span className="text-base font-black">{formatPrice(grandTotal)}</span>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-zinc-100 dark:border-zinc-800 text-center text-[10px] text-zinc-400 dark:text-zinc-500 print:text-black">
          Thank you for checkout with Dilnova Commerce Hub! This is a simulated transaction receipt.
        </div>
      </div>

      {/* Auto-print trigger scripts for convenience */}
      <script dangerouslySetInnerHTML={{ __html: `
        // Auto trigger print layout on loaded
        window.addEventListener('DOMContentLoaded', () => {
          setTimeout(() => {
            window.print();
          }, 500);
        });
      ` }} />
    </main>
  );
}
