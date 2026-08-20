import { notFound } from "next/navigation";
import { db } from "@/shared/db/client";
import { simulatedOrders, shipments } from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import { Truck, CheckCircle2, MapPin, ExternalLink, PackageCheck, Clock } from "lucide-react";

export const revalidate = 0;

interface TrackPageProps {
  params: Promise<{ orderId: string }>;
}

export default async function CustomerTrackPage({ params }: TrackPageProps) {
  const { orderId } = await params;

  const [order] = await db
    .select()
    .from(simulatedOrders)
    .where(eq(simulatedOrders.id, orderId))
    .limit(1);

  if (!order) {
    notFound();
  }

  const [shipment] = await db
    .select()
    .from(shipments)
    .where(eq(shipments.orderId, orderId))
    .limit(1);

  const status = order.status;

  let liveEvents = shipment?.events ?? [];
  const trackingNum = shipment?.trackingNumber || order.trackingNumber;

  if (trackingNum) {
    try {
      const { getCarrier } = await import("@/shared/shipping/carrier-registry");
      let carrierId = "slpost";
      const service = shipment?.shippingService || "";
      const carrierName = (shipment?.carrierName || order.carrierName || "").toLowerCase();

      if (service.startsWith("easypost_") || carrierName.includes("easypost")) {
        carrierId = "easypost";
      } else if (service.startsWith("shippo_") || carrierName.includes("shippo")) {
        carrierId = "shippo";
      }

      const carrier = getCarrier(carrierId);
      const fetched = await carrier.getTrackingEvents(trackingNum);
      if (fetched && fetched.length > 0) {
        liveEvents = fetched;
      }
    } catch (err) {
      console.warn("[CustomerTrackPage] Failed to fetch live tracking events:", err);
    }
  }

  const isShipped = status === "shipped" || Boolean(trackingNum);
  const isDelivered =
    status === "fulfilled" ||
    status === "delivered" ||
    liveEvents.some((e) => e.status === "delivered");

  const events =
    liveEvents.length > 0
      ? liveEvents
      : [
          {
            status: "label_created",
            description: "Order placed & registered for dispatch",
            timestamp: order.createdAt
              ? new Date(order.createdAt).toISOString()
              : new Date().toISOString(),
          },
        ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6 mb-8">
          <div>
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-1">
              Live Shipment Tracking
            </span>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Order #{order.id.slice(0, 8)}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Carrier:{" "}
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {order.carrierName || "Dilnova Express"}
              </span>
              {order.trackingNumber && (
                <>
                  {" "}
                  · AWB:{" "}
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {order.trackingNumber}
                  </span>
                </>
              )}
            </p>
          </div>
          {order.trackingUrl && (
            <a
              href={order.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-sm"
            >
              <ExternalLink className="h-4 w-4" /> Track Shipment
            </a>
          )}
        </div>

        {/* Status Stepper */}
        <div className="mb-10">
          <div className="grid grid-cols-3 gap-2 relative">
            {/* Dispatched step */}
            <div className="flex flex-col items-center text-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm mb-2 transition-all ${
                  isShipped
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                }`}
              >
                <Truck className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Dispatched
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Order handed to carrier
              </span>
            </div>

            {/* In Transit step */}
            <div className="flex flex-col items-center text-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm mb-2 transition-all ${
                  isShipped
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                }`}
              >
                <MapPin className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                In Transit
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">On the way</span>
            </div>

            {/* Delivered step */}
            <div className="flex flex-col items-center text-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm mb-2 transition-all ${
                  isDelivered
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                }`}
              >
                <PackageCheck className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Delivered
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Package completed
              </span>
            </div>
          </div>
        </div>

        {/* Timeline List */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-500" /> Tracking History Timeline
          </h2>
          <div className="space-y-4">
            {events.map((evt, idx) => (
              <div key={idx} className="flex gap-4 items-start">
                <div className="mt-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="flex-1 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    {evt.description}
                  </p>
                  {evt.location && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Location: {evt.location}
                    </p>
                  )}
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block font-mono">
                    {new Date(evt.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
