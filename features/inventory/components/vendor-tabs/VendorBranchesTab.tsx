'use client';

import { useState, useTransition } from 'react';
import {
  createBranchAction,
  updateBranchAction,
  deleteBranchAction,
  assignBranchMemberAction,
  removeBranchMemberAction,
} from '@/features/inventory/vendor-branch.actions';
import { toast } from 'sonner';

interface VendorBranchesTabProps {
  data: any; // Will be properly typed during TS cleanup
  refreshData: () => void;
  triggerNotification: (success: boolean, text: string) => void;
  confirmAction: (opts: any) => Promise<boolean>;
}

export default function VendorBranchesTab({
  data,
  refreshData,
  triggerNotification,
  confirmAction,
}: VendorBranchesTabProps) {
  const [isPending, startTransition] = useTransition();

  // --- Modals State ---
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [branchName, setBranchName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchPhone, setBranchPhone] = useState('');

  const [isAssignMemberModalOpen, setIsAssignMemberModalOpen] = useState(false);
  const [assignBranchId, setAssignBranchId] = useState('');
  const [assignMemberId, setAssignMemberId] = useState('');
  const [assignRole, setAssignRole] = useState<'cashier' | 'manager'>('cashier');

  // --- Helpers ---
  const getMemberName = (userId: string) => {
    return data.orgMembers.find((m: any) => m.userId === userId)?.name || userId;
  };

  const getMemberEmail = (userId: string) => {
    return data.orgMembers.find((m: any) => m.userId === userId)?.email || '';
  };

  // --- Handlers ---
  const handleSaveBranch = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        if (editingBranch) {
          await updateBranchAction({
            id: editingBranch.id,
            name: branchName,
            address: branchAddress,
            phone: branchPhone,
          });
          triggerNotification(true, 'Branch updated.');
        } else {
          await createBranchAction({
            name: branchName,
            address: branchAddress,
            phone: branchPhone,
          });
          triggerNotification(true, 'Branch created.');
        }
        setIsBranchModalOpen(false);
        refreshData();
      } catch (err) {
        triggerNotification(false, err instanceof Error ? err.message : 'Action failed.');
      }
    });
  };

  const handleDeleteBranch = async (id: string) => {
    const confirmed = await confirmAction({
      title: 'Delete Branch',
      message: 'Are you sure you want to delete this branch? All branch stock records will be removed.',
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;

    toast.promise(
      deleteBranchAction(id).then(() => refreshData()),
      {
        loading: 'Deleting branch...',
        success: 'Branch deleted.',
        error: (err) => (err instanceof Error ? err.message : 'Action failed.'),
      }
    );
  };

  const handleAssignMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignBranchId || !assignMemberId) {
      triggerNotification(false, 'Branch and member are required.');
      return;
    }
    startTransition(async () => {
      try {
        await assignBranchMemberAction({
          branchId: assignBranchId,
          memberUserId: assignMemberId,
          role: assignRole,
        });
        triggerNotification(true, 'Member assigned to branch.');
        setIsAssignMemberModalOpen(false);
        refreshData();
      } catch (err) {
        triggerNotification(false, err instanceof Error ? err.message : 'Failed to assign.');
      }
    });
  };

  const handleRemoveMember = async (id: string) => {
    const confirmed = await confirmAction({
      title: 'Remove Assignment',
      message: 'Remove this member assignment?',
      confirmText: 'Remove',
      variant: 'danger',
    });
    if (!confirmed) return;

    toast.promise(
      removeBranchMemberAction(id).then(() => refreshData()),
      {
        loading: 'Removing assignment...',
        success: 'Assignment removed.',
        error: (err) => (err instanceof Error ? err.message : 'Failed to remove.'),
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50">Branch Stores & Warehouses</h3>
          <p className="text-xs text-zinc-400">Allocate separate stock capacities and map cashiers/POS registers.</p>
        </div>
        <button
          onClick={() => {
            setEditingBranch(null);
            setBranchName('');
            setBranchAddress('');
            setBranchPhone('');
            setIsBranchModalOpen(true);
          }}
          disabled={!data.premiumStatus.multiBranchActive && data.branches.length >= 1}
          title={
            !data.premiumStatus.multiBranchActive && data.branches.length >= 1
              ? 'Upgrade to Tier 2 for Multi-Branch'
              : undefined
          }
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + Add Branch
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.branches.map((b: any) => (
          <div
            key={b.id}
            className="bg-white border border-zinc-200 rounded-2xl p-4 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm space-y-3"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">🏬 {b.name}</span>
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
                    setBranchAddress(b.address || '');
                    setBranchPhone(b.phone || '');
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
                    setAssignMemberId('');
                    setAssignRole('cashier');
                    setIsAssignMemberModalOpen(true);
                  }}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold"
                >
                  + Assign Member
                </button>
              </div>
              <div className="space-y-1.5">
                {data.branchMembers
                  .filter((bm: any) => bm.branchId === b.id)
                  .map((bm: any) => (
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
                {data.branchMembers.filter((bm: any) => bm.branchId === b.id).length === 0 && (
                  <p className="text-[10px] text-zinc-400">
                    No members assigned yet. Single-owner defaults active.
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* --- Branch Add/Edit Modal --- */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md">
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">
                {editingBranch ? 'Edit Branch Location' : 'Register New Branch'}
              </h3>
            </div>
            <form onSubmit={handleSaveBranch} className="p-5 space-y-3.5">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Branch Name</label>
                <input
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 focus:outline-none"
                  placeholder="e.g. Uptown POS Outlet"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Street Address</label>
                <input
                  type="text"
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 focus:outline-none"
                  placeholder="Street name, City"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Store Phone Contact</label>
                <input
                  type="text"
                  value={branchPhone}
                  onChange={(e) => setBranchPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 focus:outline-none"
                  placeholder="+123..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsBranchModalOpen(false)}
                  className="flex-1 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md"
                >
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Assign Member Modal --- */}
      {isAssignMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md">
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">Assign Member/Cashier</h3>
            </div>
            <form onSubmit={handleAssignMember} className="p-5 space-y-3.5">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Select Member</label>
                <select
                  value={assignMemberId}
                  onChange={(e) => setAssignMemberId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 focus:outline-none"
                >
                  <option value="">-- Select Org Member --</option>
                  {data.orgMembers.map((m: any) => (
                    <option key={m.userId} value={m.userId}>
                      {m.name} {m.email ? `(${m.email})` : ''}
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
          </div>
        </div>
      )}
    </div>
  );
}
