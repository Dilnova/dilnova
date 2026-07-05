import Link from 'next/link';

export type RestrictedAccessType = 'premium_ims' | 'premium_billing' | 'no_branch' | 'unauthorized';

interface RestrictedAccessBlockProps {
  type: RestrictedAccessType;
  errorMsg?: string;
  className?: string;
}

export function RestrictedAccessBlock({ type, errorMsg, className = '' }: RestrictedAccessBlockProps) {
  let emoji = '⛔';
  let title = 'Access Restricted';
  let message = 'You do not have permission to view this content.';
  let actionHref = '/contact';
  let actionText = 'Contact Administrator';
  let showAction = true;

  switch (type) {
    case 'premium_ims':
      emoji = '👑';
      title = 'Premium Inventory Management System';
      message = 'Unlock multi-branch stock levels, supplier management directories, real-time POS cash register checkouts, and historical stock audit log tracking. Ask your platform superadmin to enable IMS under /superadmin → Inventory → Licenses.';
      actionText = 'Contact Admin to Activate Upgrade';
      break;
    case 'premium_billing':
      emoji = '👑';
      title = 'Premium Billing Register Module';
      message = 'Unlock POS cash registers, cashier duty assignments, real-time stock deductions, and printed thermal receipts. Ask your platform superadmin to enable billing under /superadmin → Inventory → Licenses.';
      actionText = 'Contact Admin to Activate Upgrade';
      break;
    case 'no_branch':
      emoji = '🏢';
      title = 'No Branch Assigned';
      message = 'Your account has not been assigned to any specific branch location. You need a branch assignment to access this feature. Please contact your organization administrator to allocate you to a branch.';
      showAction = false;
      break;
    case 'unauthorized':
    default:
      emoji = '⛔';
      title = 'Not Authorized';
      message = 'You do not have the required permissions to view this page or perform this action.';
      showAction = false;
      break;
  }

  return (
    <div className={`text-center py-16 border border-zinc-250 rounded-2xl dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 shadow-sm space-y-4 max-w-xl mx-auto mt-6 ${className}`}>
      <div className="text-5xl">{emoji}</div>
      <h2 className="text-lg font-black text-zinc-900 dark:text-white">{title}</h2>
      <p className="text-zinc-500 text-xs leading-relaxed font-medium">
        {message}
      </p>
      {errorMsg && (
        <div className="bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 p-3 rounded-lg text-xs font-mono font-medium">
          Status: {errorMsg}
        </div>
      )}
      {showAction && (
        <div className="pt-4">
          <Link
            href={actionHref}
            className="px-6 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-block shadow-md"
          >
            {actionText}
          </Link>
        </div>
      )}
    </div>
  );
}
