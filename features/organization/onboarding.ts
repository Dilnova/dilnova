import { clerkClient } from "@clerk/nextjs/server";
import { orgSettings } from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/shared/logging/logger";

export interface MandatoryFieldItem {
  key: string;
  label: string;
  isComplete: boolean;
  step: number;
}

export interface OrgOnboardingStatus {
  orgId: string;
  completionPercent: number;
  isCompleted: boolean;
  mandatoryFields: MandatoryFieldItem[];
  missingFieldKeys: string[];
  initialValues: {
    description: string;
    address: string;
    phone: string;
    bannerUrl: string;
    baseCurrency: string;
    stockAllocationMode?: "target_branch" | "central_intake";
    checkoutOptions?: Record<string, boolean>;
  };
}

export function computeOnboardingStatusFromData(
  orgId: string,
  publicMetadata: Record<string, unknown> = {},
  dbBaseCurrency: string = "LKR",
  isCurrencyConfiguredInDb: boolean = true,
): OrgOnboardingStatus {
  const description =
    typeof publicMetadata.description === "string" ? publicMetadata.description.trim() : "";
  const address = typeof publicMetadata.address === "string" ? publicMetadata.address.trim() : "";
  const phone = typeof publicMetadata.phone === "string" ? publicMetadata.phone.trim() : "";
  const bannerUrl =
    typeof publicMetadata.bannerUrl === "string" ? publicMetadata.bannerUrl.trim() : "";
  const baseCurrency = (dbBaseCurrency || "LKR").trim().toUpperCase();

  const checkoutOptions =
    typeof publicMetadata.checkout_options === "object" && publicMetadata.checkout_options !== null
      ? (publicMetadata.checkout_options as Record<string, boolean>)
      : {};

  const hasFulfillmentOption = Object.entries(checkoutOptions).some(
    ([key, enabled]) => enabled === true && (key === "standard_delivery" || key === "store_pickup"),
  );
  const hasPaymentOption = Object.entries(checkoutOptions).some(
    ([key, enabled]) =>
      enabled === true &&
      (key === "cash_on_delivery" || key === "bank_transfer" || key === "pay_at_store"),
  );
  const isCheckoutConfigured = hasFulfillmentOption && hasPaymentOption;

  const mandatoryFields: MandatoryFieldItem[] = [
    {
      key: "description",
      label: "Store Description",
      isComplete: description.length > 0,
      step: 1,
    },
    {
      key: "address",
      label: "Business Address",
      isComplete: address.length > 0,
      step: 1,
    },
    {
      key: "phone",
      label: "Support Phone Number",
      isComplete: phone.length > 0,
      step: 1,
    },
    {
      key: "bannerUrl",
      label: "Store Logo / Banner",
      isComplete: bannerUrl.length > 0,
      step: 1,
    },
    {
      key: "baseCurrency",
      label: "Base Currency Configured",
      isComplete: isCurrencyConfiguredInDb && baseCurrency.length === 3,
      step: 2,
    },
    {
      key: "checkoutOptions",
      label: "Checkout Methods Configured",
      isComplete: isCheckoutConfigured,
      step: 3,
    },
  ];

  const completedCount = mandatoryFields.filter((f) => f.isComplete).length;
  const totalCount = mandatoryFields.length;
  const completionPercent = Math.round((completedCount / totalCount) * 100);
  const explicitOnboardingDone = publicMetadata.onboardingCompleted === true;
  const isCompleted = explicitOnboardingDone || completionPercent === 100;
  const missingFieldKeys = mandatoryFields.filter((f) => !f.isComplete).map((f) => f.key);

  const stockAllocationMode =
    publicMetadata.stockAllocationMode === "target_branch" ||
    publicMetadata.stockAllocationMode === "central_intake"
      ? publicMetadata.stockAllocationMode
      : "central_intake";

  return {
    orgId,
    completionPercent,
    isCompleted,
    mandatoryFields,
    missingFieldKeys,
    initialValues: {
      description,
      address,
      phone,
      bannerUrl,
      baseCurrency,
      stockAllocationMode,
      checkoutOptions,
    },
  };
}

export async function getOrgOnboardingStatus(
  orgId: string,
  cachedPublicMetadata?: Record<string, unknown>,
): Promise<OrgOnboardingStatus> {
  try {
    let publicMetadata = cachedPublicMetadata;

    if (!publicMetadata) {
      const client = await clerkClient();
      const org = await client.organizations.getOrganization({ organizationId: orgId });
      publicMetadata = (org.publicMetadata || {}) as Record<string, unknown>;
    }

    const { db } = await import("@/shared/db/client");
    const [dbOrgSetting] = await db
      .select({ baseCurrency: orgSettings.baseCurrency })
      .from(orgSettings)
      .where(eq(orgSettings.orgId, orgId))
      .limit(1);

    const isCurrencyConfiguredInDb = Boolean(dbOrgSetting);
    const baseCurrency = dbOrgSetting?.baseCurrency || "LKR";

    return computeOnboardingStatusFromData(
      orgId,
      publicMetadata,
      baseCurrency,
      isCurrencyConfiguredInDb,
    );
  } catch (err) {
    logger.error("Failed to load org onboarding status", err, { orgId });
    return computeOnboardingStatusFromData(orgId, cachedPublicMetadata || {}, "LKR", false);
  }
}
