"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/shared/db/client";
import { orgShippingRules } from "@/shared/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface ShippingRuleInput {
  zone: string;
  ruleType?: "domestic" | "international";
  minWeightGrams?: number;
  baseAmountCents: number;
  perKgCents: number;
  estimatedDays: number;
}

export async function getVendorShippingRules() {
  const { orgId } = await auth();
  if (!orgId) return [];

  return db.select().from(orgShippingRules).where(eq(orgShippingRules.orgId, orgId));
}

export async function saveVendorShippingRules(rules: ShippingRuleInput[]) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    throw new Error("Unauthorized — vendor organization required");
  }

  for (const rule of rules) {
    const ruleType =
      rule.zone === "western" || rule.zone === "domestic" ? "domestic" : "international";

    // Delete existing rule for this zone if any
    await db
      .delete(orgShippingRules)
      .where(and(eq(orgShippingRules.orgId, orgId), eq(orgShippingRules.zone, rule.zone)));

    // Insert updated rule
    await db.insert(orgShippingRules).values({
      orgId,
      ruleType,
      zone: rule.zone,
      minWeightGrams: rule.minWeightGrams ?? 0,
      baseAmountCents: rule.baseAmountCents,
      perKgCents: rule.perKgCents,
      estimatedDays: rule.estimatedDays,
      isActive: true,
    });
  }

  revalidatePath("/vendor/settings/shipping");
  return { success: true };
}
