'use client';

import { useState, useTransition } from 'react';
import {
  vendorCreateSupplierAction,
  vendorUpdateSupplierAction,
  vendorDeleteSupplierAction,
} from '@/features/inventory/vendor-supplier.actions';
import { toast } from 'sonner';

interface VendorSuppliersTabProps {
  data: any; // Will be properly typed during TS cleanup
  refreshData: () => void;
  triggerNotification: (success: boolean, text: string) => void;
  confirmAction: (opts: any) => Promise<boolean>;
}

export default function VendorSuppliersTab({
  data,
  refreshData,
  triggerNotification,
  confirmAction,
}: VendorSuppliersTabProps) {
  const [isPending, startTransition] = useTransition();

  // --- Supplier Modal State ---
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [supplierName, setSupplierName] = useState('');
  const [supplierContact, setSupplierContact] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        if (editingSupplier) {
          await vendorUpdateSupplierAction({
            id: editingSupplier.id,
            name: supplierName,
            contactName: supplierContact,
            email: supplierEmail,
            phone: supplierPhone,
            address: supplierAddress,
          });
          triggerNotification(true, 'Supplier updated.');
        } else {
          await vendorCreateSupplierAction({
            name: supplierName,
            contactName: supplierContact,
            email: supplierEmail,
            phone: supplierPhone,
            address: supplierAddress,
          });
          triggerNotification(true, 'Supplier added.');
        }
        setIsSupplierModalOpen(false);
        refreshData();
      } catch (err) {
        triggerNotification(false, err instanceof Error ? err.message : 'Action failed.');
      }
    });
  };

  const handleDeleteSupplier = async (id: string) => {
    const confirmed = await confirmAction({
      title: 'Delete Supplier',
      message: 'Are you sure you want to delete this supplier?',
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;

    toast.promise(
      vendorDeleteSupplierAction(id).then(() => refreshData()),
      {
        loading: 'Deleting supplier...',
        success: 'Supplier deleted.',
        error: (err) => (err instanceof Error ? err.message : 'Action failed.'),
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50">Supplier Directory</h3>
        <button
          onClick={() => {
            setEditingSupplier(null);
            setSupplierName('');
            setSupplierContact('');
            setSupplierEmail('');
            setSupplierPhone('');
            setSupplierAddress('');
            setIsSupplierModalOpen(true);
          }}
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer"
        >
          + Add Supplier
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.suppliers.map((s: any) => (
          <div key={s.id} className="bg-white border border-zinc-200 rounded-2xl p-4 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm space-y-2.5">
            <div className="flex justify-between items-start">
              <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{s.name}</h4>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    setEditingSupplier(s);
                    setSupplierName(s.name);
                    setSupplierContact(s.contactName || '');
                    setSupplierEmail(s.email || '');
                    setSupplierPhone(s.phone || '');
                    setSupplierAddress(s.address || '');
                    setIsSupplierModalOpen(true);
                  }}
                  className="text-xs text-zinc-400 hover:text-indigo-600"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteSupplier(s.id)}
                  className="text-xs text-rose-500 hover:text-rose-700 ml-2"
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="text-xs text-zinc-500 space-y-1">
              {s.contactName && <p>👤 {s.contactName}</p>}
              {s.email && <p>✉️ {s.email}</p>}
              {s.phone && <p>📞 {s.phone}</p>}
              {s.address && <p>📍 {s.address}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* --- Add / Edit Supplier Modal --- */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-950 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-xl font-bold mb-4">{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</h2>
            <form onSubmit={handleSaveSupplier} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Contact Name (Optional)</label>
                <input
                  type="text"
                  value={supplierContact}
                  onChange={(e) => setSupplierContact(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Email</label>
                  <input
                    type="email"
                    value={supplierEmail}
                    onChange={(e) => setSupplierEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Phone</label>
                  <input
                    type="text"
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Address (Optional)</label>
                <input
                  type="text"
                  value={supplierAddress}
                  onChange={(e) => setSupplierAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="flex-1 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-xl text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold disabled:opacity-50"
                >
                  {isPending ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Add Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
