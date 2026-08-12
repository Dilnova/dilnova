import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/shared/db/client";
import { returns, simulatedOrders } from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import { RotateCcw, PackageCheck, AlertCircle } from "lucide-react";

export const revalidate = 0;

export default async function CustomerReturnsPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  // Fetch eligible orders (fulfilled or shipped)
  const userOrders = await db
    .select()
    .from(simulatedOrders)
    .where(eq(simulatedOrders.customerUserId, userId));

  // Fetch existing return requests
  const userReturns = await db.select().from(returns).where(eq(returns.customerId, userId));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
          <RotateCcw className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Returns & RMA Portal
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage product return requests, track reverse logistics, and view refund status.
          </p>
        </div>
      </div>

      {/* Existing Return Requests */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm mb-8">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <PackageCheck className="h-4 w-4 text-indigo-500" /> Active Return Requests (
          {userReturns.length})
        </h2>

        {userReturns.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-slate-100 dark:border-slate-800/80 rounded-xl">
            <AlertCircle className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              You currently have no active return requests.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {userReturns.map((rma) => (
              <div
                key={rma.id}
                className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <span className="text-xs font-mono font-medium text-indigo-600 dark:text-indigo-400">
                    RMA #{rma.id.slice(0, 8)}
                  </span>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    Reason: {rma.reason}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Requested on {new Date(rma.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 capitalize">
                    Status: {rma.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Eligible Orders List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Your Delivered Orders ({userOrders.length})
        </h2>
        {userOrders.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No completed orders available for returns.
          </p>
        ) : (
          <div className="space-y-3">
            {userOrders.map((ord) => (
              <div
                key={ord.id}
                className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    Order #{ord.id.slice(0, 8)}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 block">
                    Total: LKR {(ord.totalAmount / 100).toFixed(2)}
                  </span>
                </div>
                <a
                  href={`/customer/track/${ord.id}`}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium transition-colors"
                >
                  Track Order
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
