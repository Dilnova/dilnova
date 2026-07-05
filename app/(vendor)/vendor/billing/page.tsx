import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import POSBillingClient from '@/features/billing/components/POSBillingClient';
import { getVendorBillingRegisterData } from '@/features/billing/register.actions';
import { RestrictedAccessBlock } from '@/shared/components/RestrictedAccessBlock';
import { getSystemSetting } from '@/shared/platform/settings';

export const revalidate = 0; // Fresh load

export default async function VendorBillingPage() {
  const { userId, orgId, orgRole } = await auth();
  if (!userId || !orgId || (orgRole !== 'org:admin' && orgRole !== 'org:member')) {
    redirect('/unauthorized');
  }

  const client = await clerkClient();
  const org = await client.organizations.getOrganization({ organizationId: orgId });

  let billingData = null;
  let errorMsg = '';
  try {
    billingData = await getVendorBillingRegisterData();
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : 'Unable to load billing register.';
  }

  const systemName = await getSystemSetting('system_name', 'Dilnova');

  return (
    <main className="px-2 py-3 sm:px-4 md:px-6 max-w-[1700px] mx-auto font-sans w-full pb-20 lg:pb-6">
      {billingData && billingData.premiumStatus.billingActive ? (
        <>
          {orgRole === 'org:member' && billingData.branches.length === 0 ? (
            <RestrictedAccessBlock type="no_branch" />
          ) : (
            <POSBillingClient
              initialData={billingData}
              systemName={systemName}
              orgName={org.name}
              isAdmin={orgRole === 'org:admin'}
            />
          )}
        </>
      ) : (
        <RestrictedAccessBlock type="premium_billing" errorMsg={errorMsg || undefined} />
      )}
    </main>
  );
}
