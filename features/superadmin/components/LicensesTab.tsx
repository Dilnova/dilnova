"use client";

import { useState, useTransition, useEffect } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { updateOrgImsLicenseAction } from "@/features/inventory/superadmin.actions";
import dynamic from "next/dynamic";

const IMSLicenseModal = dynamic(() => import("./IMSLicenseModal"), { ssr: false });

interface Organization {
  id: string;
  name: string;
  slug: string | null;
  imageUrl: string;
  publicMetadata: Record<string, any>;
}

interface LicensesTabProps {
  organizations: Organization[];
}

export default function LicensesTab({ organizations }: LicensesTabProps) {
  const [isPending, startTransition] = useTransition();

  // ── IMS License Modal State ──
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [managingOrg, setManagingOrg] = useState<Organization | null>(null);
  const [licenseImsEnabled, setLicenseImsEnabled] = useState(false);
  const [licenseImsExpiresAt, setLicenseImsExpiresAt] = useState("");
  const [licenseImsMultiBranchEnabled, setLicenseImsMultiBranchEnabled] = useState(false);
  const [licenseImsBillingEnabled, setLicenseImsBillingEnabled] = useState(false);
  const [licenseMaxListingCount, setLicenseMaxListingCount] = useState<number>(10);
  const [now, setNow] = useState<number>(0);

  useEffect(() => {
    requestAnimationFrame(() => {
      setNow(Date.now());
    });
  }, []);

  const handleSaveLicense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingOrg) return;
    startTransition(async () => {
      try {
        await updateOrgImsLicenseAction({
          organizationId: managingOrg.id,
          imsEnabled: licenseImsEnabled,
          imsExpiresAt: licenseImsExpiresAt || null,
          imsMultiBranchEnabled: licenseImsMultiBranchEnabled,
          imsBillingEnabled: licenseImsBillingEnabled,
          imsMaxListingCount: licenseMaxListingCount,
        });
        toast.success("Organization IMS license updated successfully.");
        setIsLicenseModalOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update license.");
      }
    });
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-50">
              IMS License Management
            </h2>
            <p className="text-[10px] sm:text-[11px] text-zinc-400 font-mono mt-0.5">
              Control premium feature flags and access limits per organization
            </p>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl dark:bg-zinc-950 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 uppercase font-mono text-[10px] tracking-wider">
                  <th className="py-2.5 px-4">Organization</th>
                  <th className="py-2.5 px-4">IMS Status</th>
                  <th className="py-2.5 px-4">Expires At</th>
                  <th className="py-2.5 px-4">Multi-Branch</th>
                  <th className="py-2.5 px-4">POS Billing</th>
                  <th className="py-2.5 px-4">Max Listings</th>
                  <th className="py-2.5 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {organizations.map((org) => {
                  const imsEnabled = org.publicMetadata?.ims_enabled === true;
                  const imsExpiresAt = org.publicMetadata?.ims_expires_at || null;
                  const multiBranchEnabled = org.publicMetadata?.ims_multi_branch_enabled === true;
                  const billingEnabled = org.publicMetadata?.ims_billing_enabled === true;
                  const maxListings: number =
                    typeof org.publicMetadata?.ims_max_listing_count === "number" &&
                    org.publicMetadata.ims_max_listing_count >= 1
                      ? org.publicMetadata.ims_max_listing_count
                      : 10;

                  let isExpired = false;
                  if (imsExpiresAt) {
                    isExpired = new Date(imsExpiresAt).getTime() < now;
                  }

                  return (
                    <tr key={org.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {org.imageUrl && (
                            <Image
                              src={org.imageUrl}
                              alt={org.name}
                              width={24}
                              height={24}
                              className="w-6 h-6 rounded-full"
                            />
                          )}
                          <div>
                            <p className="font-semibold text-zinc-900 dark:text-zinc-200">
                              {org.name}
                            </p>
                            <p className="text-[9px] text-zinc-400 font-mono">ID: {org.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {imsEnabled ? (
                          isExpired ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                              EXPIRED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                              ACTIVE
                            </span>
                          )
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-150 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                            INACTIVE
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-550">
                        {imsExpiresAt
                          ? new Date(imsExpiresAt).toLocaleDateString()
                          : "Lifetime Access"}
                      </td>
                      <td className="py-3 px-4">
                        {multiBranchEnabled ? (
                          <span className="text-emerald-600">✓ Unlocked</span>
                        ) : (
                          <span className="text-zinc-400">— Locked</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {billingEnabled ? (
                          <span className="text-emerald-600">✓ Unlocked</span>
                        ) : (
                          <span className="text-zinc-400">— Locked</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 font-mono">
                          {maxListings.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => {
                            setManagingOrg(org);
                            setLicenseImsEnabled(imsEnabled);
                            setLicenseImsExpiresAt(
                              imsExpiresAt
                                ? new Date(imsExpiresAt).toISOString().split("T")[0]
                                : "",
                            );
                            setLicenseImsMultiBranchEnabled(multiBranchEnabled);
                            setLicenseImsBillingEnabled(billingEnabled);
                            setLicenseMaxListingCount(maxListings);
                            setIsLicenseModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {organizations.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-400 font-mono text-sm">
                      No organizations found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── IMS License Modal ── */}
      {isLicenseModalOpen && managingOrg && (
        <IMSLicenseModal
          managingOrg={managingOrg}
          onClose={() => setIsLicenseModalOpen(false)}
          licenseImsEnabled={licenseImsEnabled}
          setLicenseImsEnabled={setLicenseImsEnabled}
          licenseImsExpiresAt={licenseImsExpiresAt}
          setLicenseImsExpiresAt={setLicenseImsExpiresAt}
          licenseImsMultiBranchEnabled={licenseImsMultiBranchEnabled}
          setLicenseImsMultiBranchEnabled={setLicenseImsMultiBranchEnabled}
          licenseImsBillingEnabled={licenseImsBillingEnabled}
          setLicenseImsBillingEnabled={setLicenseImsBillingEnabled}
          licenseMaxListingCount={licenseMaxListingCount}
          setLicenseMaxListingCount={setLicenseMaxListingCount}
          handleSaveLicense={handleSaveLicense}
          isPending={isPending}
        />
      )}
    </>
  );
}
