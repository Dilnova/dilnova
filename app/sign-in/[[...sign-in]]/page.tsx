import { SignIn } from "@clerk/nextjs";
import { getSafeRedirectUrl } from "@/shared/security/redirect";

type SignInPageProps = {
  searchParams: Promise<{ redirect_url?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { redirect_url: redirectUrl } = await searchParams;
  const safeRedirectUrl = getSafeRedirectUrl(redirectUrl);

  return (
    <main className="flex min-h-[70vh] items-center justify-center p-6">
      <SignIn forceRedirectUrl={safeRedirectUrl} />
    </main>
  );
}
