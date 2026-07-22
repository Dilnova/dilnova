import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { getClerkUserEmail } from "@/features/customer/email";
import { getCustomerDashboardData } from "@/features/customer/services/customer-dashboard.service";
import CustomerHeaderBanner from "@/features/customer/components/dashboard/CustomerHeaderBanner";
import CustomerMetricsSummary from "@/features/customer/components/dashboard/CustomerMetricsSummary";
import CustomerWishlistTab from "@/features/customer/components/dashboard/CustomerWishlistTab";
import CustomerOrdersTab from "@/features/customer/components/dashboard/CustomerOrdersTab";
import CustomerSettingsTab from "@/features/customer/components/dashboard/CustomerSettingsTab";

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function CustomerPage({ searchParams }: PageProps) {
  const { orgRole, userId } = await auth();
  const user = await currentUser();

  if (!user || !userId) {
    return null;
  }

  const userEmail = getClerkUserEmail(user) || "No email";
  const resolvedParams = await searchParams;
  const activeTab = resolvedParams.tab || "saved";

  const dashboardData = await getCustomerDashboardData(userId);
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Customer";
  const joinedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Unknown";

  return (
    <main className="px-4 py-6 sm:px-6 md:px-10 lg:px-12 sm:py-8 max-w-5xl mx-auto font-sans w-full flex-1 animate-fade-in">
      <CustomerHeaderBanner
        fullName={fullName}
        userEmail={userEmail}
        joinedDate={joinedDate}
        userAvatar={user.imageUrl}
      />

      <CustomerMetricsSummary
        wishlistCount={dashboardData.wishlistItems.length}
        ordersCount={dashboardData.orders.length}
        totalSpent={dashboardData.totalSpent}
      />

      <div className="flex bg-zinc-100 dark:bg-zinc-900/60 backdrop-blur-md p-1 rounded-2xl mb-8 border border-zinc-200/50 dark:border-zinc-800/30 max-w-sm">
        <Link
          href="?tab=saved"
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "saved"
              ? "bg-white dark:bg-zinc-800 text-purple-700 dark:text-purple-400 shadow-xs"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          }`}
        >
          ❤️ Wishlist ({dashboardData.wishlistItems.length})
        </Link>
        <Link
          href="?tab=orders"
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "orders"
              ? "bg-white dark:bg-zinc-800 text-purple-700 dark:text-purple-400 shadow-xs"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          }`}
        >
          📋 Orders ({dashboardData.orders.length})
        </Link>
        <Link
          href="?tab=settings"
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "settings"
              ? "bg-white dark:bg-zinc-800 text-purple-700 dark:text-purple-400 shadow-xs"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          }`}
        >
          ⚙️ Profile
        </Link>
      </div>

      {activeTab === "saved" && (
        <CustomerWishlistTab
          wishlistItems={dashboardData.wishlistItems}
          organizations={dashboardData.organizations as any[]}
        />
      )}

      {activeTab === "orders" && (
        <CustomerOrdersTab
          orders={dashboardData.orders}
          itemsByOrderId={dashboardData.itemsByOrderId}
          pickupBranchNameById={dashboardData.pickupBranchNameById}
          checkoutOptionsCatalog={dashboardData.checkoutOptionsCatalog}
        />
      )}

      {activeTab === "settings" && (
        <CustomerSettingsTab
          user={{ id: user.id, firstName: user.firstName ?? null, lastName: user.lastName ?? null }}
          orgRole={orgRole}
          userRole={dashboardData.userRole}
          isSuperAdmin={dashboardData.isSuperAdmin}
          deliveryDetails={dashboardData.deliveryDetails}
        />
      )}

      <div className="mt-8 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <Link
          href="/"
          className="text-xs font-semibold text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200 underline underline-offset-4"
        >
          &larr; Back to Main Page
        </Link>
      </div>
    </main>
  );
}
