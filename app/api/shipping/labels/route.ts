import { NextResponse } from "next/server";
import { z } from "zod/v3";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/shared/db/client";
import { simulatedOrders, simulatedOrderItems, shipments, branches } from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import { getCarrier } from "@/shared/shipping/carrier-registry";
import { parseBranchToOrigin } from "@/shared/shipping/rate-engine";

const createLabelSchema = z.object({
  orderId: z.string().uuid(),
});

export async function POST(req: Request) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json(
        { error: "Unauthorized — vendor organization required" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { orderId } = createLabelSchema.parse(body);

    // Fetch target order
    const [order] = await db
      .select()
      .from(simulatedOrders)
      .where(eq(simulatedOrders.id, orderId))
      .limit(1);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Fetch order items and verify vendor authorization
    const orderItems = await db
      .select()
      .from(simulatedOrderItems)
      .where(eq(simulatedOrderItems.orderId, orderId));

    const vendorItems = orderItems.filter((item) => item.vendorOrgId === orgId);
    if (vendorItems.length === 0) {
      return NextResponse.json(
        { error: "Forbidden — this order does not contain items from your organization" },
        { status: 403 },
      );
    }

    // Calculate total weight
    const totalWeightGrams = vendorItems.reduce((sum, item) => sum + item.quantity * 500, 0);

    // Fetch vendor origin branch
    const [vendorBranch] = await db
      .select()
      .from(branches)
      .where(eq(branches.orgId, orgId))
      .limit(1);

    const origin = parseBranchToOrigin(vendorBranch);
    const destination = {
      name: order.customerName ?? "Customer",
      street: order.shippingAddress ?? "Delivery Address",
      city: order.shippingCity ?? "Colombo",
      state: order.shippingState ?? "",
      postalCode: order.shippingPostalCode ?? "",
      country: order.shippingCountry ?? "LK",
      phone: order.shippingPhone ?? undefined,
    };

    const carrier = getCarrier("builtin");
    const shipmentResult = await carrier.createShipment(
      origin,
      destination,
      [{ weightGrams: totalWeightGrams, lengthCm: 15, widthCm: 15, heightCm: 15 }],
      "builtin_express",
    );

    // Persist shipment details into DB
    await db.insert(shipments).values({
      orderId: order.id,
      vendorOrgId: orgId,
      originBranchId: vendorBranch?.id ?? null,
      carrierName: "Dilnova Express",
      shipmentExternalId: shipmentResult.shipmentExternalId,
      trackingNumber: shipmentResult.trackingNumber,
      trackingUrl: shipmentResult.trackingUrl,
      labelUrl: shipmentResult.labelUrl,
      status: "label_created",
      shippingService: "Dilnova Standard Express",
      rateAmountCents: order.shippingAmount,
      weightGrams: totalWeightGrams,
      estimatedDeliveryDate: shipmentResult.estimatedDeliveryDate,
    });

    // Update order status to shipped
    await db
      .update(simulatedOrders)
      .set({
        carrierName: "Dilnova Express",
        trackingNumber: shipmentResult.trackingNumber,
        trackingUrl: shipmentResult.trackingUrl,
        labelUrl: shipmentResult.labelUrl,
        shipmentExternalId: shipmentResult.shipmentExternalId,
        shippedAt: new Date(),
        status: "shipped",
        updatedAt: new Date(),
      })
      .where(eq(simulatedOrders.id, orderId));

    return NextResponse.json({
      success: true,
      trackingNumber: shipmentResult.trackingNumber,
      trackingUrl: shipmentResult.trackingUrl,
      labelUrl: shipmentResult.labelUrl,
      estimatedDeliveryDate: shipmentResult.estimatedDeliveryDate,
    });
  } catch (err: unknown) {
    console.error("[POST /api/shipping/labels] Error:", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to generate shipment label" }, { status: 500 });
  }
}
