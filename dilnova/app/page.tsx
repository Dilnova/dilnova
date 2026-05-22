import { auth, currentUser } from '@clerk/nextjs/server';
import { OrganizationList } from '@clerk/nextjs';
import Link from 'next/link';

export default async function Home() {
  const { orgId, orgRole } = await auth();
  const user = await currentUser();

  // Determine permissions based on organization role
  const hasAdminAccess = orgId && orgRole === 'org:admin';
  const hasVendorAccess = orgId && (orgRole === 'org:vendor' || orgRole === 'org:member' || orgRole === 'org:admin');
  const hasCustomerAccess = orgId && (orgRole === 'org:customer' || orgRole === 'org:member' || orgRole === 'org:admin');

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 font-sans flex flex-col antialiased selection:bg-purple-500 selection:text-white">
      
      {/* Decorative background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] pointer-events-none opacity-40 dark:opacity-20 z-0">
        <div className="absolute top-[-10%] left-[10%] w-[40%] h-[60%] rounded-full bg-gradient-to-tr from-purple-400 to-indigo-500 blur-[120px]" />
        <div className="absolute top-[-5%] right-[10%] w-[35%] h-[50%] rounded-full bg-gradient-to-tl from-pink-400 to-rose-400 blur-[100px]" />
      </div>

      {/* Hero Header */}
      <header className="relative max-w-6xl mx-auto px-6 pt-20 pb-12 text-center z-10 w-full">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50 mb-6">
          Dilnova Organization-Scoped RBAC
        </span>
        
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-none mb-6">
          Multi-Vendor Commerce <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-500 bg-clip-text text-transparent dark:from-purple-400 dark:via-indigo-300 dark:to-blue-400">
            With Org-Scoped Roles
          </span>
        </h1>
        
        <p className="max-w-2xl mx-auto text-base sm:text-lg text-zinc-650 dark:text-zinc-400 leading-relaxed mb-8">
          A secure multi-tenant commerce engine. Permissions, members, and portals are scoped entirely inside Clerk Organizations.
        </p>
      </header>

      {/* Main Content */}
      <main className="relative max-w-6xl mx-auto px-6 pb-24 z-10 w-full flex-1">
        
        {!user ? (
          /* Signed Out View */
          <div className="max-w-md mx-auto text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-2xl shadow-sm">
            <h2 className="text-lg font-semibold mb-2">Authentication Required</h2>
            <p className="text-sm text-zinc-550 dark:text-zinc-450 leading-relaxed mb-4">
              Please sign in or sign up using the header buttons to access the organization sandbox.
            </p>
          </div>
        ) : !orgId ? (
          /* Signed In but No Active Organization */
          <div className="max-w-xl mx-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-2xl shadow-md text-center">
            <h2 className="text-xl font-bold mb-2">Organization Required</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-8 leading-relaxed">
              This application requires an active organization context. Please select an existing organization, accept an invitation, or create a new test organization below.
            </p>
            
            <div className="flex justify-center border-t border-zinc-100 dark:border-zinc-800 pt-6 overflow-hidden">
              <OrganizationList 
                hidePersonal={true} 
                afterCreateOrganizationUrl="/" 
                afterSelectOrganizationUrl="/" 
              />
            </div>
          </div>
        ) : (
          /* Active Organization Sandbox */
          <section className="border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4 border-b border-zinc-150 dark:border-zinc-850 pb-6">
              <div>
                <p className="text-xs text-zinc-400 font-mono uppercase tracking-wider">Active Workspace</p>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Active Organization Detected</h2>
              </div>

              <div className="flex flex-col sm:items-end gap-1">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 font-mono">
                  Organization ID: <code className="text-[11px] bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">{orgId}</code>
                </span>
                <span className="text-xs font-semibold text-zinc-650 dark:text-zinc-350 font-mono">
                  Your Role: <strong className="text-purple-600 dark:text-purple-400 uppercase">{orgRole}</strong>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              
              {/* Card 1: Admin Panel */}
              <div className={`p-6 rounded-xl border flex flex-col justify-between transition-all ${
                hasAdminAccess 
                  ? 'bg-zinc-50/50 border-zinc-200 hover:border-zinc-300 dark:bg-zinc-900/10 dark:border-zinc-850 dark:hover:border-zinc-750' 
                  : 'bg-zinc-100/20 border-zinc-200/50 opacity-50 dark:bg-zinc-900/5 dark:border-zinc-900/50'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-sm tracking-tight">Organization Members</h3>
                    <span className="text-[10px] bg-red-100/80 text-red-800 font-mono font-bold px-2 py-0.5 rounded dark:bg-red-950/30 dark:text-red-400">ORG:ADMIN</span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                    Admin Console. Manage and change membership roles (`org:member`, `org:admin`, etc.) inside this active organization.
                  </p>
                </div>
                <Link
                  href="/admin"
                  className={`inline-flex items-center justify-center h-9 w-full rounded-lg text-xs font-semibold transition-all ${
                    hasAdminAccess
                      ? 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 cursor-pointer'
                      : 'bg-zinc-100 text-zinc-400 pointer-events-none dark:bg-zinc-900/40 dark:text-zinc-700'
                  }`}
                >
                  {hasAdminAccess ? 'Open Admin Console' : 'Admin Access Only'}
                </Link>
              </div>

              {/* Card 2: Vendor Portal */}
              <div className={`p-6 rounded-xl border flex flex-col justify-between transition-all ${
                hasVendorAccess 
                  ? 'bg-zinc-50/50 border-zinc-200 hover:border-zinc-300 dark:bg-zinc-900/10 dark:border-zinc-850 dark:hover:border-zinc-750' 
                  : 'bg-zinc-100/20 border-zinc-200/50 opacity-50 dark:bg-zinc-900/5 dark:border-zinc-900/50'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-sm tracking-tight">Vendor Dashboard</h3>
                    <span className="text-[10px] bg-amber-100/80 text-amber-800 font-mono font-bold px-2 py-0.5 rounded dark:bg-amber-950/30 dark:text-amber-400">ORG:VENDOR</span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                    Simple plain text page showing order fulfillments and workspace feed for the current organization.
                  </p>
                </div>
                <Link
                  href="/vendor"
                  className={`inline-flex items-center justify-center h-9 w-full rounded-lg text-xs font-semibold transition-all ${
                    hasVendorAccess
                      ? 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 cursor-pointer'
                      : 'bg-zinc-100 text-zinc-400 pointer-events-none dark:bg-zinc-900/40 dark:text-zinc-700'
                  }`}
                >
                  {hasVendorAccess ? 'Open Vendor Portal' : 'Vendor Access Only'}
                </Link>
              </div>

              {/* Card 3: Customer Portal */}
              <div className={`p-6 rounded-xl border flex flex-col justify-between transition-all ${
                hasCustomerAccess 
                  ? 'bg-zinc-50/50 border-zinc-200 hover:border-zinc-300 dark:bg-zinc-900/10 dark:border-zinc-850 dark:hover:border-zinc-750' 
                  : 'bg-zinc-100/20 border-zinc-200/50 opacity-50 dark:bg-zinc-900/5 dark:border-zinc-900/50'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-sm tracking-tight">Customer Area</h3>
                    <span className="text-[10px] bg-blue-100/80 text-blue-800 font-mono font-bold px-2 py-0.5 rounded dark:bg-blue-950/30 dark:text-blue-400">ORG:CUSTOMER</span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                    Simple buyer portal for account history and purchase details for the active organization.
                  </p>
                </div>
                <Link
                  href="/customer"
                  className={`inline-flex items-center justify-center h-9 w-full rounded-lg text-xs font-semibold transition-all ${
                    hasCustomerAccess
                      ? 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 cursor-pointer'
                      : 'bg-zinc-100 text-zinc-400 pointer-events-none dark:bg-zinc-900/40 dark:text-zinc-700'
                  }`}
                >
                  {hasCustomerAccess ? 'Open Customer Area' : 'Customer Access Only'}
                </Link>
              </div>

            </div>

            <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 dark:bg-zinc-900/50 dark:border-zinc-800 text-xs font-mono leading-relaxed text-zinc-600 dark:text-zinc-400">
              <p className="font-bold mb-1 uppercase tracking-wider text-zinc-500">How to test org-scoped RBAC roles:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Because you created this organization, you are its <strong className="text-zinc-800 dark:text-zinc-200">org:admin</strong> and can enter all portals.</li>
                <li>Go to the **Admin Console** above to view the active organization members list.</li>
                <li>Use the Clerk **Organization Switcher** in the top header to invite another test user (or email) and assign them a specific role.</li>
                <li>Once they accept and sign in, change their role from the Admin dropdown to verify restricted access.</li>
              </ol>
            </div>
          </section>
        )}

        {/* Feature Cards */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold tracking-tight text-center text-zinc-900 dark:text-zinc-50 mb-10">
            Tenant-Isolated Access Architecture
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-650 dark:text-purple-400 font-bold font-mono text-sm">
                01
              </div>
              <h3 className="text-base font-semibold">Tenant Isolation</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Users can belong to multiple businesses or stores. Access control checks evaluate the active organization context.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-650 dark:text-indigo-400 font-bold font-mono text-sm">
                02
              </div>
              <h3 className="text-base font-semibold">Clerk Native Engine</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Leverages Clerk’s built-in Organization API. Role permissions are fetched and verified securely via Clerk's session tokens.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-650 dark:text-pink-400 font-bold font-mono text-sm">
                03
              </div>
              <h3 className="text-base font-semibold">Dynamic Actions</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Membership lists and permissions update dynamically. Admins can update roles inside the active workspace instantly.
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-900 py-8 text-center text-xs text-zinc-500 dark:text-zinc-600 w-full z-10 relative">
        <p>&copy; {new Date().getFullYear()} Dilnova Commerce. All rights reserved.</p>
      </footer>
    </div>
  );
}
