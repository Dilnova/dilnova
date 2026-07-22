"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateContactStatusAction } from "@/features/superadmin/actions";
import { TabDataTableLayout, type ColumnDef } from "@/shared/ui/TabDataTableLayout";

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

  const [contactSearch, setContactSearch] = useState("");
  const [contactStatusFilter, setContactStatusFilter] = useState<
    "all" | "pending" | "connected" | "no_longer"
  >("all");
  const [contactCategoryFilter, setContactCategoryFilter] = useState<
    "all" | "collaboration" | "registration" | "info"
  >("all");

  const triggerNotification = (success: boolean, text: string) => {
    if (success) toast.success(text);
    else toast.error(text);
  };

  const handleUpdateContactStatus = async (
    contactId: string,
    status: "pending" | "connected" | "no_longer",
  ) => {
    startTransition(async () => {
      try {
        await updateContactStatusAction(contactId, status);
        triggerNotification(true, "Contact request status updated successfully.");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to update contact status.";
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
    const matchesStatus = contactStatusFilter === "all" || c.status === contactStatusFilter;
    const matchesCategory = contactCategoryFilter === "all" || c.category === contactCategoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const columns: ColumnDef<ContactSubmission>[] = [
    {
      header: "Contact Info",
      cell: (c) => (
        <div>
          <div className="font-bold text-zinc-950 dark:text-zinc-50">{c.name}</div>
          <div className="font-mono text-zinc-400 text-xs">&lt;{c.email}&gt;</div>
          <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono mt-1">
            {new Date(c.createdAt).toLocaleString()}
          </div>
        </div>
      ),
    },
    {
      header: "Category",
      cell: (c) => (
        <span className="text-purple-600 dark:text-purple-400 font-bold uppercase text-[10px] px-2 py-1 rounded bg-purple-50 dark:bg-purple-900/20">
          {c.category}
        </span>
      ),
    },
    {
      header: "Message",
      cell: (c) => (
        <div className="max-w-xs">
          <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">{c.subject}</div>
          <div className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-3 whitespace-pre-wrap">
            {c.message}
          </div>
        </div>
      ),
    },
    {
      header: "Status",
      className: "text-right",
      cell: (c) => (
        <select
          value={c.status}
          onChange={(e) =>
            handleUpdateContactStatus(c.id, e.target.value as "pending" | "connected" | "no_longer")
          }
          className={`text-[11px] font-bold px-2 py-1.5 rounded-lg border focus:outline-none cursor-pointer ${
            c.status === "connected"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50"
              : c.status === "no_longer"
                ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50"
                : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50"
          }`}
        >
          <option value="pending">Pending</option>
          <option value="connected">Connected</option>
          <option value="no_longer">No Longer</option>
        </select>
      ),
    },
  ];

  const renderMobileCard = (c: ContactSubmission) => (
    <div className="bg-white border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
      <div>
        <h3 className="font-bold text-zinc-950 dark:text-zinc-50 text-sm">{c.name}</h3>
        <span className="font-normal text-zinc-400 text-xs font-mono">&lt;{c.email}&gt;</span>
        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
          Category:{" "}
          <span className="text-purple-600 dark:text-purple-400 font-bold uppercase">
            {c.category}
          </span>
        </p>
      </div>
      <div className="space-y-1 mt-3">
        <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Subject: {c.subject}</p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/40 p-2 rounded border border-zinc-100 dark:border-zinc-900 leading-relaxed whitespace-pre-wrap">
          {c.message}
        </p>
      </div>
      <div className="pt-3">
        <select
          value={c.status}
          onChange={(e) =>
            handleUpdateContactStatus(c.id, e.target.value as "pending" | "connected" | "no_longer")
          }
          className={`w-full text-xs font-bold px-2 py-2 rounded-lg border focus:outline-none ${
            c.status === "connected"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50"
              : c.status === "no_longer"
                ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50"
                : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50"
          }`}
        >
          <option value="pending">Connect Request</option>
          <option value="connected">Already Connected</option>
          <option value="no_longer">No Longer Connected</option>
        </select>
      </div>
    </div>
  );

  return (
    <TabDataTableLayout
      isPending={isPending}
      title="Contact Submissions"
      subtitle="Manage partner connections and user registration requests"
      filters={
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
              onChange={(e) =>
                setContactStatusFilter(
                  e.target.value as "all" | "pending" | "connected" | "no_longer",
                )
              }
              className="px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-900 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Connect requests (Pending)</option>
              <option value="connected">Already Connected</option>
              <option value="no_longer">No Longer Connected</option>
            </select>
            <select
              value={contactCategoryFilter}
              onChange={(e) =>
                setContactCategoryFilter(
                  e.target.value as "all" | "collaboration" | "registration" | "info",
                )
              }
              className="px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-900 focus:outline-none"
            >
              <option value="all">All Categories</option>
              <option value="collaboration">Collaboration</option>
              <option value="registration">Registration</option>
              <option value="info">Info</option>
            </select>
          </div>
        </div>
      }
      data={filteredSubmissions}
      columns={columns}
      renderMobileCard={renderMobileCard}
      emptyStateMessage="No contact form submissions found."
    />
  );
}
