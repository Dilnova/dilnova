import AgeGatedSignUp from "./AgeGatedSignUp";
import { getSafeRedirectUrl } from "@/shared/security/redirect";

type SignUpPageProps = {
  searchParams: Promise<{ redirect_url?: string }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { redirect_url: redirectUrl } = await searchParams;
  const safeRedirectUrl = getSafeRedirectUrl(redirectUrl);

  return (
    <main className="flex min-h-[70vh] items-center justify-center p-6">
      <AgeGatedSignUp redirectUrl={safeRedirectUrl} />
    </main>
  );
}
