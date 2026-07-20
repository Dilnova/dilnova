import { checkSuperAdmin } from '@/shared/auth/superadmin-guard';
import { createSupabaseAdminClient } from '@/shared/storage/admin-client';
import { GDPR_EXPORTS_BUCKET, GDPR_EXPORT_TTL_SECONDS } from '@/shared/storage/config';
import Link from 'next/link';

export default async function GDPRDownloadPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ file?: string }>;
}) {
  await checkSuperAdmin();

  const { userId } = await params;
  const { file } = await searchParams;

  if (!file) {
    return (
      <div className="p-8 text-center text-red-600 font-sans">
        Missing file parameter.
      </div>
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(GDPR_EXPORTS_BUCKET)
    .createSignedUrl(file, GDPR_EXPORT_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    return (
      <div className="p-8 text-center text-red-600 font-sans">
        File not found or link expired. Exports are automatically deleted after 24 hours.
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-8 mt-12 bg-white dark:bg-zinc-950 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 text-center font-sans">
      <h1 className="text-2xl font-bold mb-4 text-zinc-900 dark:text-zinc-50">Secure GDPR Download</h1>
      <p className="text-zinc-600 dark:text-zinc-400 mb-8">
        Your export for user <strong className="font-mono text-xs break-all">{userId}</strong> is ready. 
        This link expires in {Math.round(GDPR_EXPORT_TTL_SECONDS / 60)} minutes.
      </p>
      
      <a 
        href={data.signedUrl}
        className="inline-flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white font-medium px-6 py-3 rounded-lg w-full transition-colors"
      >
        Download JSON Export
      </a>

      <div className="mt-6 text-sm text-zinc-500">
        <Link href="/superadmin" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
