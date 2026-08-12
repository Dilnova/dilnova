import { NextResponse } from "next/server";
import { db } from "@/shared/db/client";
import { shipments, simulatedOrders } from "@/shared/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const trackingNumber = searchParams.get("tracking");

  if (!trackingNumber) {
    return NextResponse.json({ error: "Missing tracking number" }, { status: 400 });
  }

  // Fetch shipment and order details
  const [shipment] = await db
    .select()
    .from(shipments)
    .where(eq(shipments.trackingNumber, trackingNumber))
    .limit(1);

  const order = shipment
    ? (
        await db
          .select()
          .from(simulatedOrders)
          .where(eq(simulatedOrders.id, shipment.orderId))
          .limit(1)
      )[0]
    : null;

  const recipientName = order?.customerName ?? "Customer";
  const recipientStreet = order?.shippingAddress ?? "Delivery Address";
  const recipientCity = order?.shippingCity ?? "Colombo";
  const recipientCountry = order?.shippingCountry ?? "LK";
  const carrierName = shipment?.carrierName ?? "Dilnova Express";
  const zone = shipment?.shippingZone ?? "DOMESTIC";
  const weightKg = shipment?.weightGrams ? (shipment.weightGrams / 1000).toFixed(2) : "0.50";

  // Return thermal 4x6 printable HTML label format with auto-print
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Shipping Label - ${trackingNumber}</title>
  <style>
    @page { size: 4in 6in; margin: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      width: 4in;
      height: 6in;
      margin: 0;
      padding: 16px;
      box-sizing: border-box;
      background: #fff;
      color: #000;
    }
    .label-box {
      border: 3px solid #000;
      height: 100%;
      box-sizing: border-box;
      padding: 12px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .header {
      border-bottom: 2px solid #000;
      padding-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo { font-size: 18px; font-weight: 900; letter-spacing: 1px; }
    .badge { font-size: 11px; font-weight: bold; background: #000; color: #fff; padding: 2px 6px; border-radius: 4px; }
    .address-section { margin: 10px 0; font-size: 12px; }
    .section-title { font-size: 9px; font-weight: bold; text-transform: uppercase; color: #555; }
    .address-box { margin-bottom: 12px; }
    .consignee { font-size: 15px; font-weight: bold; margin-top: 2px; }
    .barcode-container {
      text-align: center;
      border-top: 2px dashed #000;
      border-bottom: 2px dashed #000;
      padding: 12px 0;
      margin: 8px 0;
    }
    .tracking-text { font-family: monospace; font-size: 14px; font-weight: bold; letter-spacing: 2px; margin-top: 4px; }
    .footer { font-size: 10px; display: flex; justify-content: space-between; font-weight: bold; }
  </style>
</head>
<body onload="window.print()">
  <div class="label-box">
    <div class="header">
      <div class="logo">DILNOVA LOGISTICS</div>
      <div class="badge">${zone.toUpperCase()}</div>
    </div>

    <div class="address-section">
      <div class="address-box">
        <div class="section-title">FROM (SHIPPER):</div>
        <div>Dilnova Vendor Fulfillment Center</div>
        <div>Main Street, Colombo 01, Sri Lanka</div>
      </div>

      <div class="address-box">
        <div class="section-title">SHIP TO (CONSIGNEE):</div>
        <div class="consignee">${recipientName}</div>
        <div>${recipientStreet}</div>
        <div>${recipientCity}, ${recipientCountry}</div>
      </div>
    </div>

    <div class="barcode-container">
      <svg id="barcode"></svg>
      <div class="tracking-text">${trackingNumber}</div>
    </div>

    <div class="footer">
      <div>CARRIER: ${carrierName.toUpperCase()}</div>
      <div>WEIGHT: ${weightKg} KG</div>
      <div>DATE: ${new Date().toLocaleDateString()}</div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
  <script>
    try {
      JsBarcode("#barcode", "${trackingNumber}", {
        format: "CODE128",
        width: 2,
        height: 50,
        displayValue: false
      });
    } catch(e){}
  </script>
</body>
</html>`;

  return new Response(htmlContent, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
