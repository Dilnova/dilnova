'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { updateContactStatusAction } from '@/features/superadmin/actions';

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  createdAt: Date;
}

interface ContactsTabProps {
  contactSubmissions: ContactSubmission[];
}

export default function ContactsTab({ contactSubmissions }: ContactsTabProps) {
  const [isPending, startTransition] = useTransition();

  const [contactSearch, setContactSearch] = useState('');
  const [contactStatusFilter, setContactStatusFilter] = useState<'all' | 'pending' | 'connected' | 'no_longer'>('all');
  const [contactCategoryFilter, setContactCategoryFilter] = useState<'all' | 'collaboration' | 'registration' | 'info'>('all');

  const triggerNotification = (success: boolean, text: string) => {
    if (success) toast.success(text);
    else toast.error(text);
  };

  const handleUpdateContactStatus = async (contactId: string, status: 'pending' | 'connected' | 'no_longer') => {
    startTransition(async () => {
      try {
        await updateContactStatusAction(contactId, status);
        triggerNotification(true, 'Contact request status updated successfully.');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to update contact status.';
        triggerNotification(false, msg);
      }
    });
  };

  const filteredSubmissions = contactSubmissions.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.email.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.subject.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.message.toLowerCase().includes(contactSearch.toLowerCase());
    const matchesStatus = contactStatusFilter === 'all' || c.status === contactStatusFilter;
    const matchesCategory = contactCategoryFilter === 'all' || c.category === contactCategoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="space-y-4 relative">
      {isPending && (
        <div className="fixed inset-0 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-[2px] flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 px-5 py-3 rounded-xl shadow-2xl text-xs font-mono font-bold tracking-wider flex items-center gap-2.5">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            SAVING...
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-50">Contact Submissions</h2>
        <p className="text-[10px] sm:text-[11px] text-zinc-400 font-mono mt-0.5">Manage partner connections and user registration requests</p>
      </div>

      {/* Filters toolbar */}
      <div className="bg-white border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search name, email, message..."
            value={contactSearch}
            onChange={(e) => setContactSearch(e.target.value)}
            className="w-full pl-4 pr-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={contactStatusFilter}
            onChange={(e) => setContactStatusFilter(e.target.value as 'all' | 'pending' | 'connected' | 'no_longer')}
            className="px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-900 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Connect requests (Pending)</option>
            <option value="connected">Already Connected</option>
            <option value="no_longer">No Longer Connected</option>
          </select>
          <select
            value={contactCategoryFilter}
            onChange={(e) => setContactCategoryFilter(e.target.value as 'all' | 'collaboration' | 'registration' | 'info')}
            className="px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-900 focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="collaboration">Collaboration</option>
            <option value="registration">Registration</option>
            <option value="info">Info</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {filteredSubmissions.map((c) => (
          <div key={c.id} className="bg-white border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h3 className="font-bold text-zinc-950 dark:text-zinc-50 text-sm flex items-center gap-2">
                  <span>{c.name}</span>
                  <span className="font-normal text-zinc-400 text-xs font-mono">&lt;{c.email}&gt;</span>
                </h3>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                  Submitted on {new Date(c.createdAt).toLocaleString()} · Category:{' '}
                  <span className="text-purple-600 dark:text-purple-400 font-bold uppercase">{c.category}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-zinc-400">Status:</span>
                <select
                  value={c.status}
                  onChange={(e) => handleUpdateContactStatus(c.id, e.target.value as 'pending' | 'connected' | 'no_longer')}
                  className={`text-xs font-bold px-2 py-1 rounded-lg border focus:outline-none cursor-pointer ${
                    c.status === 'connected'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50'
                      : c.status === 'no_longer'
                      ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50'
                      : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50'
                  }`}
                >
                  <option value="pending">Connect Request (Pending)</option>
                  <option value="connected">Already Connected</option>
                  <option value="no_longer">No Longer Connected</option>
                </select>
              </div>
            </div>

            <div className="space-y-1 pt-1.5 border-t border-zinc-100 dark:border-zinc-900">
              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Subject: {c.subject}</p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-100 dark:border-zinc-900 leading-relaxed whitespace-pre-wrap">
                {c.message}
              </p>
            </div>
          </div>
        ))}

        {filteredSubmissions.length === 0 && (
          <div className="py-12 text-center text-zinc-400 text-xs font-mono border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
            No contact form submissions found.
          </div>
        )}
      </div>
    </div>
  );
}
