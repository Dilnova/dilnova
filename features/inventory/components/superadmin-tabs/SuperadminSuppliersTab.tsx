"use client";

import { useState, useTransition } from "react";
import { Supplier } from "../inventory.types";
import { toast } from "sonner";
import InventoryModal from "../InventoryModal";
import { useConfirm } from "@/shared/ui/notifications";
import {
  createSupplierAction,
  updateSupplierAction,
  deleteSupplierAction,
} from "@/features/inventory/superadmin.actions";

interface SuperadminSuppliersTabProps {
  suppliers: Supplier[];
}

export default function SuperadminSuppliersTab({ suppliers }: SuperadminSuppliersTabProps) {
  const [isPending, startTransition] = useTransition();
  const { confirmAction } = useConfirm();

  // ── Supplier Modal State ──
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierName, setSupplierName] = useState("");
  const [supplierOrgId, setSupplierOrgId] = useState("");
  const [supplierContactName, setSupplierContactName] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [supplierAddress, setSupplierAddress] = useState("");

  const openAddSupplier = () => {
    setEditingSupplier(null);
    setSupplierName("");
    setSupplierOrgId("");
    setSupplierContactName("");
    setSupplierEmail("");
    setSupplierPhone("");
    setSupplierAddress("");
    setIsSupplierModalOpen(true);
  };

  const openEditSupplier = (s: Supplier) => {
    setEditingSupplier(s);
    setSupplierName(s.name);
    setSupplierOrgId(s.orgId);
    setSupplierContactName(s.contactName || "");
    setSupplierEmail(s.email || "");
    setSupplierPhone(s.phone || "");
    setSupplierAddress(s.address || "");
    setIsSupplierModalOpen(true);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        if (editingSupplier) {
          await updateSupplierAction({
            id: editingSupplier.id,
            name: supplierName,
            contactName: supplierContactName,
            email: supplierEmail,
            phone: supplierPhone,
            address: supplierAddress,
          });
          toast.success("Supplier updated.");
        } else {
          if (!supplierOrgId) {
            toast.error("Organization ID is required.");
            return;
          }
          await createSupplierAction({
            orgId: supplierOrgId,
            name: supplierName,
            contactName: supplierContactName,
            email: supplierEmail,
            phone: supplierPhone,
            address: supplierAddress,
          });
          toast.success("Supplier created.");
        }
        setIsSupplierModalOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save supplier.");
      }
    });
  };

  const handleDeleteSupplier = async (id: string) => {
    const confirmed = await confirmAction({
      title: "Delete Supplier",
      message: "Delete this supplier? This will unlink it from any inventory records.",
      confirmText: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;

    startTransition(async () => {
      try {
        await deleteSupplierAction(id);
        toast.success("Supplier deleted.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete supplier.");
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-50">
            Supplier Directory
          </h2>
          <p className="text-[10px] sm:text-[11px] text-zinc-400 font-mono mt-0.5 hidden sm:block">
            {suppliers.length} suppliers registered
          </p>
        </div>
        <button
          onClick={openAddSupplier}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer active:scale-[0.97] whitespace-nowrap"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Supplier
        </button>
      </div>

      {/* Suppliers Grid */}
      {suppliers.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-zinc-200 rounded-2xl dark:border-zinc-800">
          <div className="text-5xl mb-4">🏭</div>
          <p className="text-zinc-600 dark:text-zinc-300 text-sm font-semibold">
            No suppliers registered yet
          </p>
          <p className="text-zinc-400 text-xs mt-1.5">
            Add your first supplier to link with inventory records.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {suppliers.map((s) => (
            <div
              key={s.id}
              className="bg-white border border-zinc-200 rounded-xl p-4 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm space-y-2.5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{s.name}</h3>
                  <p className="text-[10px] text-zinc-400 font-mono">Org: {s.orgId}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditSupplier(s)}
                    className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all cursor-pointer"
                    title="Edit"
                  >
                    <svg
                      className="w-3.5 h-3.5 text-zinc-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteSupplier(s.id)}
                    className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all cursor-pointer"
                    title="Delete"
                  >
                    <svg
                      className="w-3.5 h-3.5 text-rose-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                {s.contactName && <p>👤 {s.contactName}</p>}
                {s.email && <p>✉️ {s.email}</p>}
                {s.phone && <p>📞 {s.phone}</p>}
                {s.address && <p>📍 {s.address}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Supplier Modal ── */}
      {isSupplierModalOpen && (
        <InventoryModal
          isOpen={true}
          onClose={() => setIsSupplierModalOpen(false)}
          className="bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md max-h-[90vh] overflow-y-auto"
        >
          <div className="p-5 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">
              {editingSupplier ? "Edit Supplier" : "Add Supplier"}
            </h3>
          </div>
          <form onSubmit={handleSaveSupplier} className="p-5 space-y-3">
            {!editingSupplier && (
              <div className="space-y-1.5">
                <label
                  htmlFor="supplierOrgId"
                  className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400"
                >
                  Organization ID <span className="text-rose-500">*</span>
                </label>
                <input
                  id="supplierOrgId"
                  type="text"
                  value={supplierOrgId}
                  onChange={(e) => setSupplierOrgId(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 font-mono transition-all"
                  placeholder="org_..."
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label
                htmlFor="supplierName"
                className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400"
              >
                Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="supplierName"
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
                placeholder="Acme Supplies"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="supplierContactName"
                className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400"
              >
                Contact Name
              </label>
              <input
                id="supplierContactName"
                type="text"
                value={supplierContactName}
                onChange={(e) => setSupplierContactName(e.target.value)}
                className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
                placeholder="John Smith"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="supplierEmail"
                className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400"
              >
                Email
              </label>
              <input
                id="supplierEmail"
                type="email"
                value={supplierEmail}
                onChange={(e) => setSupplierEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
                placeholder="john@acme.com"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="supplierPhone"
                className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400"
              >
                Phone
              </label>
              <input
                id="supplierPhone"
                type="tel"
                value={supplierPhone}
                onChange={(e) => setSupplierPhone(e.target.value)}
                className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
                placeholder="+1 (555) 000-0000"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="supplierAddress"
                className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400"
              >
                Address
              </label>
              <textarea
                id="supplierAddress"
                value={supplierAddress}
                onChange={(e) => setSupplierAddress(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
                placeholder="123 Main St..."
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsSupplierModalOpen(false)}
                className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md disabled:opacity-50"
              >
                Save Supplier
              </button>
            </div>
          </form>
        </InventoryModal>
      )}
    </div>
  );
}
