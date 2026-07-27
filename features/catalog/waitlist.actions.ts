"use server";

import { z } from "zod/v3";
import { actionClient } from "@/lib/safe-action";
import { db } from "@/shared/db/client";
import { productWaitlists, products } from "@/shared/db/schema";
import { eq, and } from "drizzle-orm";
import { createHash } from "crypto";
import { auth } from "@clerk/nextjs/server";

function hashEmail(email: string): string {
  return createHash("sha256").update(email.toLowerCase().trim()).digest("hex");
}

const subscribeWaitlistSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  email: z.string().email("Please enter a valid email address"),
});

export const subscribeProductWaitlistAction = actionClient
  .schema(subscribeWaitlistSchema)
  .action(async ({ parsedInput: { productId, email } }) => {
    const { userId } = await auth();

    // Verify product exists
    const [existingProduct] = await db
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!existingProduct) {
      throw new Error("Target product not found.");
    }

    const emailClean = email.toLowerCase().trim();
    const emailHash = hashEmail(emailClean);

    // Check if already subscribed
    const [existingSub] = await db
      .select({ id: productWaitlists.id })
      .from(productWaitlists)
      .where(
        and(eq(productWaitlists.productId, productId), eq(productWaitlists.emailHash, emailHash)),
      )
      .limit(1);

    if (existingSub) {
      return {
        success: true,
        alreadySubscribed: true,
        message: "You are already registered on the waitlist for this item!",
      };
    }

    // Create subscription
    await db.insert(productWaitlists).values({
      productId,
      email: emailClean,
      emailHash,
      userId: userId || null,
    });

    return {
      success: true,
      alreadySubscribed: false,
      message: `You're on the waitlist for ${existingProduct.name}! We will notify you when price & stock are announced.`,
    };
  });
