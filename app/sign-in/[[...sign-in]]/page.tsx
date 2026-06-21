import { SignIn } from '@clerk/nextjs';

type SignInPageProps = {
  searchParams: Promise<{ redirect_url?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { redirect_url: redirectUrl } = await searchParams;

  return (
    <main className="flex min-h-[70vh] items-center justify-center p-6">
      <SignIn forceRedirectUrl={redirectUrl ?? '/'} />
    </main>
  );
}
