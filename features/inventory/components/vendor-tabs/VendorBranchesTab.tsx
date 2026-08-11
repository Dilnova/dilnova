"use client";

import { useState, useTransition } from "react";
import {
  createBranchAction,
  updateBranchAction,
  deleteBranchAction,
  assignBranchMemberAction,
  removeBranchMemberAction,
} from "@/features/inventory/vendor-branch.actions";
import { toast } from "sonner";
import InventoryModal from "../InventoryModal";
import DeliveryAddressFormFields from "@/features/customer/components/DeliveryAddressFormFields";

import type { VendorInventoryFullData } from "@/features/inventory/types";

function parseInitialBranchAddress(rawAddress: string) {
  if (!rawAddress)
    return { street: "", line2: "", city: "", state: "", postalCode: "", country: "Sri Lanka" };
  const parts = rawAddress
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length >= 4) {
    return {
      street: parts[0] || "",
      line2: parts.length > 4 ? parts[1] : "",
      city: parts[parts.length - 4] || parts[1] || "",
      state: parts[parts.length - 3] || parts[2] || "",
      postalCode: parts[parts.length - 2] || "",
      country: parts[parts.length - 1] || "Sri Lanka",
    };
  }
  return {
    street: rawAddress,
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "Sri Lanka",
  };
}

interface VendorBranchesTabProps {
  data: VendorInventoryFullData;
  refreshData: () => void;
  triggerNotification: (success: boolean, text: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  confirmAction: (opts: any) => Promise<boolean>;
}

type BranchItem = VendorInventoryFullData["branches"][number];
type BranchMemberItem = VendorInventoryFullData["branchMembers"][number];
type OrgMemberItem = VendorInventoryFullData["orgMembers"][number];

export default function VendorBranchesTab({
  data,
  refreshData,
  triggerNotification,
  confirmAction,
}: VendorBranchesTabProps) {
  const [isPending, startTransition] = useTransition();

  // --- Modals State ---
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchItem | null>(null);
  const [branchName, setBranchName] = useState("");
  const [branchPhone, setBranchPhone] = useState("");

  // Structured Address State for Branch Location
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingAddressLine2, setShippingAddressLine2] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingState, setShippingState] = useState("");
  const [shippingPostalCode, setShippingPostalCode] = useState("");
  const [shippingCountry, setShippingCountry] = useState("Sri Lanka");

  const handleBranchAddressChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    if (name === "shippingAddress") setShippingAddress(value);
    if (name === "shippingAddressLine2") setShippingAddressLine2(value);
    if (name === "shippingCity") setShippingCity(value);
    if (name === "shippingState") setShippingState(value);
    if (name === "shippingPostalCode") setShippingPostalCode(value);
    if (name === "shippingCountry") setShippingCountry(value);
    if (name === "shippingPhone") setBranchPhone(value);
  };

  const [isAssignMemberModalOpen, setIsAssignMemberModalOpen] = useState(false);
  const [assignBranchId, setAssignBranchId] = useState("");
  const [assignMemberId, setAssignMemberId] = useState("");
  const [assignRole, setAssignRole] = useState<"cashier" | "manager">("cashier");

  // --- Helpers ---
  const getMemberName = (userId: string) => {
    return data.orgMembers.find((m: OrgMemberItem) => m.userId === userId)?.name || userId;
  };

  const getMemberEmail = (userId: string) => {
    return data.orgMembers.find((m: OrgMemberItem) => m.userId === userId)?.email || "";
  };

  // --- Handlers ---
  const handleSaveBranch = (e: React.FormEvent) => {
    e.preventDefault();

    const formattedAddress = [
      shippingAddress,
      shippingAddressLine2,
      shippingCity,
      shippingState,
      shippingPostalCode,
      shippingCountry,
    ]
      .filter(Boolean)
      .join(", ");

    startTransition(async () => {
      try {
        if (editingBranch) {
          await updateBranchAction({
            id: editingBranch.id,
            name: branchName,
            address: formattedAddress,
            phone: branchPhone,
          });
          triggerNotification(true, "Branch updated.");
        } else {
          await createBranchAction({
            name: branchName,
            address: formattedAddress,
            phone: branchPhone,
          });
          triggerNotification(true, "Branch created.");
        }
        setIsBranchModalOpen(false);
        refreshData();
      } catch (err) {
        triggerNotification(
          false,
          err instanceof Error && err.message ? err.message : "Action failed.",
        );
      }
    });
  };

  const handleDeleteBranch = async (id: string) => {
    const confirmed = await confirmAction({
      title: "Delete Branch",
      message:
        "Are you sure you want to delete this branch? All branch stock records will be removed.",
      confirmText: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;

    toast.promise(
      deleteBranchAction(id).then(() => refreshData()),
      {
        loading: "Deleting branch...",
        success: "Branch deleted.",
        error: (err) => (err instanceof Error && err.message ? err.message : "Action failed."),
      },
    );
  };

  const handleAssignMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignBranchId || !assignMemberId) {
      triggerNotification(false, "Branch and member are required.");
      return;
    }
    startTransition(async () => {
      try {
        await assignBranchMemberAction({
          branchId: assignBranchId,
          memberUserId: assignMemberId,
          role: assignRole,
        });
        triggerNotification(true, "Member assigned to branch.");
        setIsAssignMemberModalOpen(false);
        refreshData();
      } catch (err) {
        triggerNotification(
          false,
          err instanceof Error && err.message ? err.message : "Failed to assign.",
        );
      }
    });
  };

  const handleRemoveMember = async (id: string) => {
    const confirmed = await confirmAction({
      title: "Remove Assignment",
      message: "Remove this member assignment?",
      confirmText: "Remove",
      variant: "danger",
    });
    if (!confirmed) return;

    toast.promise(
      removeBranchMemberAction(id).then(() => refreshData()),
      {
        loading: "Removing assignment...",
        success: "Assignment removed.",
        error: (err) => (err instanceof Error ? err.message : "Failed to remove."),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50">
            Branch Stores & Warehouses
          </h3>
          <p className="text-xs text-zinc-400">
            Allocate separate stock capacities and map cashiers/POS registers.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingBranch(null);
            setBranchName("");
            setShippingAddress("");
            setShippingAddressLine2("");
            setShippingCity("");
            setShippingState("");
            setShippingPostalCode("");
            setShippingCountry("Sri Lanka");
            setBranchPhone("");
            setIsBranchModalOpen(true);
          }}
          disabled={!data.premiumStatus.multiBranchActive && data.branches.length >= 1}
          title={
            !data.premiumStatus.multiBranchActive && data.branches.length >= 1
              ? "Upgrade to Tier 2 for Multi-Branch"
              : undefined
          }
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + Add Branch
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.branches.map((b: BranchItem) => (
          <div
            key={b.id}
            className="bg-white border border-zinc-200 rounded-2xl p-4 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm space-y-3"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                  🏬 {b.name}
                </span>
                {b.isDefault && (
                  <span className="ml-2 px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase">
                    Default
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingBranch(b);
                    setBranchName(b.name);
                    const parsed = parseInitialBranchAddress(b.address || "");
                    setShippingAddress(parsed.street);
                    setShippingAddressLine2(parsed.line2);
                    setShippingCity(parsed.city);
                    setShippingState(parsed.state);
                    setShippingPostalCode(parsed.postalCode);
                    setShippingCountry(parsed.country);
                    setBranchPhone(b.phone || "");
                    setIsBranchModalOpen(true);
                  }}
                  className="text-xs text-zinc-400 hover:text-indigo-600"
                >
                  Edit
                </button>
                {!b.isDefault && (
                  <button
                    onClick={() => handleDeleteBranch(b.id)}
                    className="text-xs text-rose-500 hover:text-rose-700"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
            <div className="text-xs text-zinc-500">
              {b.address && <p>📍 {b.address}</p>}
              {b.phone && <p>📞 {b.phone}</p>}
            </div>

            <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Assigned Branch Members
                </span>
                <button
                  onClick={() => {
                    setAssignBranchId(b.id);
                    setAssignMemberId("");
                    setAssignRole("cashier");
                    setIsAssignMemberModalOpen(true);
                  }}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold"
                >
                  + Assign Member
                </button>
              </div>
              <div className="space-y-1.5">
                {data.branchMembers
                  .filter((bm: BranchMemberItem) => bm.branchId === b.id)
                  .map((bm: BranchMemberItem) => (
                    <div
                      key={bm.id}
                      className="flex justify-between items-center text-xs bg-zinc-50 dark:bg-zinc-900/50 p-2 rounded-lg"
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                          👤 {getMemberName(bm.memberUserId)}
                        </span>
                        {getMemberEmail(bm.memberUserId) && (
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono ml-5">
                            {getMemberEmail(bm.memberUserId)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRemoveMember(bm.id)}
                          className="text-rose-500 hover:text-rose-700 text-xs font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                {data.branchMembers.filter((bm: BranchMemberItem) => bm.branchId === b.id)
                  .length === 0 && (
                  <p className="text-[10px] text-zinc-400">
                    No members assigned yet. Single-owner defaults active.
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* --- Add / Edit Branch Modal --- */}
      {isBranchModalOpen && (
        <InventoryModal
          isOpen={true}
          onClose={() => setIsBranchModalOpen(false)}
          className="bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-[95vw] sm:w-full sm:max-w-xl md:max-w-2xl max-h-[90vh] flex flex-col my-auto overflow-hidden text-left"
        >
          <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-50">
                {editingBranch ? "Edit Branch Location" : "Register New Branch"}
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Set up branch outlet name, contacts, and live location details.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsBranchModalOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
          <form onSubmit={handleSaveBranch} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="branchName"
                className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
              >
                Branch Name <span className="text-red-500">*</span>
              </label>
              <input
                id="branchName"
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                required
                className="w-full h-11 px-3.5 border border-zinc-200 rounded-xl text-sm bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                placeholder="e.g. Uptown POS Outlet / Central Warehouse"
              />
            </div>
            <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Branch Location & Store Contact Information
              </label>
              <DeliveryAddressFormFields
                shippingAddress={shippingAddress}
                shippingAddressLine2={shippingAddressLine2}
                shippingCity={shippingCity}
                shippingState={shippingState}
                shippingPostalCode={shippingPostalCode}
                shippingCountry={shippingCountry}
                shippingPhone={branchPhone}
                shippingPhone2=""
                onChange={handleBranchAddressChange}
              />
            </div>
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsBranchModalOpen(false)}
                className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-md disabled:opacity-50"
              >
                {isPending ? "Saving..." : editingBranch ? "Update Branch" : "Register Branch"}
              </button>
            </div>
          </form>
        </InventoryModal>
      )}

      {/* --- Assign Member Modal --- */}
      {isAssignMemberModalOpen && (
        <InventoryModal isOpen={true} onClose={() => setIsAssignMemberModalOpen(false)}>
          <div className="p-5 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">
              Assign Member/Cashier
            </h3>
          </div>
          <form onSubmit={handleAssignMember} className="p-5 space-y-3.5">
            <div className="space-y-1.5">
              <label
                htmlFor="assignMemberId"
                className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400"
              >
                Select Member
              </label>
              <select
                id="assignMemberId"
                value={assignMemberId}
                onChange={(e) => setAssignMemberId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 focus:outline-none"
              >
                <option value="">-- Select Org Member --</option>
                {data.orgMembers.map((m: OrgMemberItem) => (
                  <option key={m.userId} value={m.userId}>
                    {m.name} {m.email ? `(${m.email})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsAssignMemberModalOpen(false)}
                className="flex-1 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md"
              >
                Assign Duty
              </button>
            </div>
          </form>
        </InventoryModal>
      )}
    </div>
  );
}
