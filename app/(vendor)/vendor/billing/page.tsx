import { Suspense } from "react";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import POSBillingClient from "@/features/billing/components/POSBillingClient";
import { getVendorBillingRegisterData } from "@/features/billing/register.actions";
import { RestrictedAccessBlock } from "@/shared/components/RestrictedAccessBlock";
import { getSystemSetting } from "@/shared/platform/settings";

async function VendorBillingData({ orgId, orgRole }: { orgId: string; orgRole: string }) {
  const client = await clerkClient();
  const org = await client.organizations.getOrganization({ organizationId: orgId });

  const billingData = await getVendorBillingRegisterData();

  const systemName = await getSystemSetting("system_name", "Dilnova");

  if (billingData && billingData.premiumStatus.billingActive) {
    if (orgRole === "org:member" && billingData.branches.length === 0) {
      return <RestrictedAccessBlock type="no_branch" />;
    }
    return (
      <POSBillingClient
        initialData={billingData}
        systemName={systemName}
        orgName={org.name}
        isAdmin={orgRole === "org:admin"}
      />
    );
  }

  return <RestrictedAccessBlock type="premium_billing" />;
}

export default async function VendorBillingPage() {
  const { userId, orgId, orgRole } = await auth();
  if (!userId || !orgId || (orgRole !== "org:admin" && orgRole !== "org:member")) {
    redirect("/unauthorized");
  }

  return (
    <main className="px-2 py-3 sm:px-4 md:px-6 max-w-[1700px] mx-auto font-sans w-full pb-20 lg:pb-6 flex flex-col min-h-screen">
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <span className="text-5xl animate-pulse">🧾</span>
            <p className="text-sm font-mono text-zinc-500 uppercase tracking-widest">
              Loading Register...
            </p>
          </div>
        }
      >
        <VendorBillingData orgId={orgId} orgRole={orgRole} />
      </Suspense>
    </main>
  );
}
