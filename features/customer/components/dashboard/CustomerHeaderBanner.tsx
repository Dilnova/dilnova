import Image from "next/image";

interface CustomerHeaderBannerProps {
  fullName: string;
  userEmail: string;
  joinedDate: string;
  userAvatar?: string;
}

export default function CustomerHeaderBanner({
  fullName,
  userEmail,
  joinedDate,
  userAvatar,
}: CustomerHeaderBannerProps) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-purple-900/5 via-indigo-900/5 to-transparent border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 bg-white dark:bg-zinc-950 shadow-xs mb-6">
      <div className="absolute top-0 right-0 p-8 opacity-[0.02] dark:opacity-[0.05]">
        <span className="text-9xl">👤</span>
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-5">
        {userAvatar ? (
          <Image
            src={userAvatar}
            alt={fullName}
            width={80}
            height={80}
            className="w-20 h-20 rounded-full border border-purple-500/20 shadow-md object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center font-bold text-2xl text-purple-700 dark:text-purple-400 border border-purple-500/20 flex-shrink-0">
            {fullName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="text-center sm:text-left space-y-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400 uppercase tracking-wider font-mono">
            Verified Customer
          </span>
          <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
            {fullName}
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-mono">
            {userEmail} • Joined {joinedDate}
          </p>
        </div>
      </div>
    </div>
  );
}
