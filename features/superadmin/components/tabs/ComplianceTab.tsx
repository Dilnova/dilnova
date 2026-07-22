"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/shared/ui/notifications";
import {
  getCustomerDsarDataAction,
  anonymizeCustomerDataAction,
} from "@/features/superadmin/actions";
import SuperadminFormCard from "../ui/SuperadminFormCard";
import { PendingOverlay } from "@/shared/ui/PendingOverlay";

export default function ComplianceTab() {
  const [isPending, startTransition] = useTransition();
  const { confirmAction } = useConfirm();

  const [complianceSearchEmail, setComplianceSearchEmail] = useState("");
  const [complianceSearchUserId, setComplianceSearchUserId] = useState("");

  const [isSearchingCompliance, setIsSearchingCompliance] = useState(false);
  const [isSearchingApi, setIsSearchingApi] = useState(false);
  const [isApiErasing, setIsApiErasing] = useState(false);

  const [searchedEmail, setSearchedEmail] = useState("");
  const [searchedUserId, setSearchedUserId] = useState("");

  const [complianceData, setComplianceData] = useState<{
    orders: any[];
    contactSubmissions: any[];
  } | null>(null);
  const [complianceApiData, setComplianceApiData] = useState<any>(null);

  const triggerNotification = (success: boolean, text: string) => {
    if (success) toast.success(text);
    else toast.error(text);
  };

  const handleSearchCustomerData = async () => {
    if (!complianceSearchEmail) {
      triggerNotification(false, "Please enter an email address.");
      return;
    }
    setIsSearchingCompliance(true);
    setSearchedEmail(complianceSearchEmail);
    try {
      const result = await getCustomerDsarDataAction(complianceSearchEmail);
      if (result.success && result.data) {
        setComplianceData(result.data);
        if (result.data.orders.length === 0 && result.data.contactSubmissions.length === 0) {
          triggerNotification(true, "No records found for this email.");
        } else {
          triggerNotification(
            true,
            `Found ${result.data.orders.length} orders and ${result.data.contactSubmissions.length} contact submissions.`,
          );
        }
      } else {
        triggerNotification(false, "Failed to retrieve data.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to retrieve DSAR data.";
      triggerNotification(false, msg);
    } finally {
      setIsSearchingCompliance(false);
    }
  };

  const handleSearchByUserId = async () => {
    if (!complianceSearchUserId) {
      triggerNotification(false, "Please enter a User ID.");
      return;
    }
    setIsSearchingApi(true);
    setSearchedUserId(complianceSearchUserId);
    try {
      const res = await fetch(`/api/compliance/user/${complianceSearchUserId}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to search API for user ID.");
      }
      const data = await res.json();
      setComplianceApiData(data);
      triggerNotification(true, "API data retrieved successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "API request failed.";
      triggerNotification(false, msg);
    } finally {
      setIsSearchingApi(false);
    }
  };

  const handleExportData = () => {
    if (!complianceData) return;
    const blob = new Blob([JSON.stringify(complianceData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dsar_export_${searchedEmail}_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    triggerNotification(true, "Data export started.");
  };

  const handleExportByUserId = () => {
    if (!complianceApiData) return;
    const blob = new Blob([JSON.stringify(complianceApiData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dsar_api_export_${searchedUserId}_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    triggerNotification(true, "API Data export started.");
  };

  const handleAnonymizeData = async () => {
    const confirmed = await confirmAction({
      title: "ERASE CUSTOMER DATA (GDPR)",
      message: `This will permanently redact/anonymize all PII across simulated orders, redact reviews/questions, delete wishlists/contact submissions, and completely delete the Clerk authentication profile for "${searchedEmail}".\n\nThis action cannot be undone. Are you sure you want to proceed?`,
      confirmText: "ERASE ALL PII",
      variant: "danger",
    });
    if (!confirmed) return;

    startTransition(async () => {
      try {
        const result = await anonymizeCustomerDataAction(searchedEmail);
        setComplianceData(null);
        setComplianceSearchEmail("");
        setSearchedEmail("");
        triggerNotification(
          true,
          `Successfully anonymized ${result.count.ordersAnonymized} orders, deleted ${result.count.submissionsDeleted} contact submissions, and wiped Clerk profile (${result.count.clerkProfileDeleted ? "Yes" : "No"}).`,
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Anonymization process failed.";
        triggerNotification(false, msg);
      }
    });
  };

  const handleAnonymizeByUserId = async () => {
    const confirmed = await confirmAction({
      title: "ERASE CUSTOMER DATA (API)",
      message: `This will permanently delete/anonymize all data associated with User ID "${searchedUserId}" via the compliance API.\n\nThis action cannot be undone. Are you sure you want to proceed?`,
      confirmText: "ERASE VIA API",
      variant: "danger",
    });
    if (!confirmed) return;

    setIsApiErasing(true);
    try {
      const res = await fetch(`/api/compliance/user/${searchedUserId}/erasure`, {
        method: "POST",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to erase data via API.");
      }
      const data = await res.json();
      setComplianceApiData(null);
      setComplianceSearchUserId("");
      setSearchedUserId("");
      triggerNotification(true, `API Erasure successful: ${JSON.stringify(data.deleted)}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "API Anonymization process failed.";
      triggerNotification(false, msg);
    } finally {
      setIsApiErasing(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <PendingOverlay isPending={isPending} />

      <div>
        <h2 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-50">
          GDPR Compliance Dashboard
        </h2>
        <p className="text-[10px] sm:text-[11px] text-zinc-400 font-mono mt-0.5">
          Manage customer Data Subject Access Requests (DSAR) and erasure requests
        </p>
      </div>

      <SuperadminFormCard title="Search Customer PII" icon="🔍" className="space-y-4">
        <div className="flex gap-2">
          <input
            type="email"
            required
            placeholder="customer@example.com"
            value={complianceSearchEmail}
            onChange={(e) => setComplianceSearchEmail(e.target.value)}
            className="flex-1 px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-base sm:text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          />
          <button
            type="button"
            onClick={handleSearchCustomerData}
            disabled={isSearchingCompliance}
            className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-xs font-bold hover:bg-zinc-800 disabled:opacity-50 cursor-pointer"
          >
            {isSearchingCompliance ? "Searching..." : "Search"}
          </button>
        </div>
      </SuperadminFormCard>

      <SuperadminFormCard
        title="Search Customer PII by User ID (API)"
        icon="🆔"
        className="space-y-4"
      >
        <div className="flex gap-2">
          <input
            type="text"
            required
            placeholder="user_2b3c4d5e6f7g8h9i0j1k2l3m4n5"
            value={complianceSearchUserId}
            onChange={(e) => setComplianceSearchUserId(e.target.value)}
            className="flex-1 px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-base sm:text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          />
          <button
            type="button"
            onClick={handleSearchByUserId}
            disabled={isSearchingApi}
            className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-xs font-bold hover:bg-zinc-800 disabled:opacity-50 cursor-pointer"
          >
            {isSearchingApi ? "Searching API..." : "Search API"}
          </button>
        </div>
      </SuperadminFormCard>

      {searchedUserId && (
        <div className="bg-white border border-zinc-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <div>
              <span className="text-[10px] uppercase font-mono text-zinc-400">
                API Results for User ID
              </span>
              <h4 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50 font-mono">
                {searchedUserId}
              </h4>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleExportByUserId}
                disabled={!complianceApiData}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[11px] font-bold hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
              >
                Export Data (API JSON)
              </button>
              <button
                type="button"
                onClick={handleAnonymizeByUserId}
                disabled={!complianceApiData || isApiErasing}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-[11px] font-bold hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                {isApiErasing ? "Erasing..." : "Anonymize/Delete PII"}
              </button>
            </div>
          </div>

          {complianceApiData && (
            <div className="space-y-4">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-lg text-[11px]">
                <p className="font-mono text-zinc-600 dark:text-zinc-400">
                  <strong>API Response Summary:</strong>
                  <br />
                  Orders: {complianceApiData.orders?.length || 0}
                  <br />
                  Contact Submissions: {complianceApiData.contactSubmissions?.length || 0}
                  <br />
                  Carts: {complianceApiData.cart ? 1 : 0}
                  <br />
                  Reviews: {complianceApiData.reviews?.length || 0}
                  <br />
                  Questions: {complianceApiData.questions?.length || 0}
                  <br />
                  Wishlists: {complianceApiData.wishlists?.length || 0}
                  <br />
                  Audit Logs: {complianceApiData.auditLogs?.length || 0}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {searchedEmail && (
        <div className="bg-white border border-zinc-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <div>
              <span className="text-[10px] uppercase font-mono text-zinc-400">Results for</span>
              <h4 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50 font-mono">
                {searchedEmail}
              </h4>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleExportData}
                disabled={
                  !complianceData ||
                  (complianceData.orders.length === 0 &&
                    complianceData.contactSubmissions.length === 0)
                }
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[11px] font-bold hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
              >
                Export Data (JSON)
              </button>
              <button
                type="button"
                onClick={handleAnonymizeData}
                disabled={
                  !complianceData ||
                  (complianceData.orders.length === 0 &&
                    complianceData.contactSubmissions.length === 0)
                }
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-[11px] font-bold hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                Anonymize/Delete PII
              </button>
            </div>
          </div>

          {complianceData && (
            <div className="space-y-4">
              {/* Orders List */}
              <div>
                <h5 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-1.5">
                  <span>🛒</span> Simulated Orders ({complianceData.orders.length})
                </h5>
                {complianceData.orders.length === 0 ? (
                  <p className="text-[11px] text-zinc-400 italic bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg">
                    No orders found for this customer.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {complianceData.orders.map((order: any) => (
                      <div
                        key={order.id}
                        className="p-3 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-lg text-[11px] flex justify-between items-center"
                      >
                        <div>
                          <p className="font-bold font-mono">
                            {order.id.slice(0, 8)}... - {order.customerName}
                          </p>
                          <p className="text-zinc-400 mt-0.5">
                            Method: {order.fulfillmentMethod} | Status: {order.status}
                          </p>
                        </div>
                        <span className="font-mono font-bold">
                          ${(order.totalAmount / 100).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Contact Submissions */}
              <div>
                <h5 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-1.5">
                  <span>📨</span> Contact Submissions ({complianceData.contactSubmissions.length})
                </h5>
                {complianceData.contactSubmissions.length === 0 ? (
                  <p className="text-[11px] text-zinc-400 italic bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg">
                    No contact requests found for this customer.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {complianceData.contactSubmissions.map((sub: any) => (
                      <div
                        key={sub.id}
                        className="p-3 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-lg text-[11px]"
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-purple-605 text-purple-600 font-mono">
                            [{sub.category.toUpperCase()}]
                          </span>
                          <span className="text-zinc-400 text-[10px]">
                            {new Date(sub.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="font-bold mt-1 text-zinc-800 dark:text-zinc-200">
                          {sub.subject}
                        </p>
                        <p className="text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 italic">
                          &ldquo;{sub.message}&rdquo;
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
