import { NextRequest, NextResponse } from 'next/server';
import { checkSuperAdmin } from '@/shared/auth/superadmin-guard';
import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { eq, inArray, sql } from 'drizzle-orm';
import { logAuditAction } from '@/shared/audit/logger';
import { clerkClient } from '@clerk/nextjs/server';

export async function GET(req: NextRequest) {
  try {
    const adminUser = await checkSuperAdmin();
    const targetUserId = req.nextUrl.searchParams.get('userId');

    if (!targetUserId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    // 1. simulatedOrders
    const orders = await db.select().from(schema.simulatedOrders).where(eq(schema.simulatedOrders.customerUserId, targetUserId));
    let populatedOrders: any[] = [];
    
    if (orders.length > 0) {
      const orderIds = orders.map((o) => o.id);
      const allItems = await db.select().from(schema.simulatedOrderItems).where(inArray(schema.simulatedOrderItems.orderId, orderIds));
      
      const itemsByOrderId = allItems.reduce((acc, item) => {
        if (!acc[item.orderId]) acc[item.orderId] = [];
        acc[item.orderId].push(item);
        return acc;
      }, {} as Record<string, typeof allItems[0][]>);
      
      populatedOrders = orders.map(order => ({
        ...order,
        items: itemsByOrderId[order.id] || []
      }));
    }

    // 2. clerk user to get email for contact submissions
    const client = await clerkClient();
    let clerkUser = null;
    let contactSubmissions: any[] = [];
    try {
      clerkUser = await client.users.getUser(targetUserId);
      const email = clerkUser.emailAddresses[0]?.emailAddress;
      if (email) {
         contactSubmissions = await db.select()
           .from(schema.contactSubmissions)
           .where(sql`lower(trim(${schema.contactSubmissions.email})) = ${email.trim().toLowerCase()}`);
      }
    } catch (e) {
      // User might be deleted from clerk already or error
    }

    // 3. Carts
    let cart = null;
    try {
        const [foundCart] = await db.select().from(schema.customerCarts).where(eq(schema.customerCarts.userId, targetUserId));
        cart = foundCart;
    } catch(e) {}

    // 4. Branch Members
    let branchMemberships: any[] = [];
    try {
        branchMemberships = await db.select().from(schema.branchMembers).where(eq(schema.branchMembers.memberUserId, targetUserId));
    } catch(e) {}

    // 5. Audit logs
    const logs = await db.select().from(schema.auditLogs).where(eq(schema.auditLogs.userId, targetUserId));

    // 6. Reviews, Questions, Wishlists
    let reviews: any[] = [];
    let questions: any[] = [];
    let wishlists: any[] = [];
    try { reviews = await db.select().from((schema as any).reviews).where(eq((schema as any).reviews.userId, targetUserId)); } catch(e) {}
    try { questions = await db.select().from((schema as any).questions).where(eq((schema as any).questions.userId, targetUserId)); } catch(e) {}
    try { wishlists = await db.select().from((schema as any).wishlists).where(eq((schema as any).wishlists.userId, targetUserId)); } catch(e) {}


    await logAuditAction({
      userId: adminUser.id,
      action: 'API_GDPR_EXPORT',
      targetType: 'data_subject_request',
      targetId: targetUserId,
      metadata: { ordersCount: populatedOrders.length, contactSubmissionsCount: contactSubmissions.length },
      strict: true,
    });

    return NextResponse.json({
      userId: targetUserId,
      orders: populatedOrders,
      contactSubmissions,
      cart,
      branchMemberships,
      reviews,
      questions,
      wishlists,
      auditLogs: logs
    });

  } catch (error) {
    console.error('GDPR Export Error:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
