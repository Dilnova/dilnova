import { SignUp } from '@clerk/nextjs';

type SignUpPageProps = {
  searchParams: Promise<{ redirect_url?: string }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { redirect_url: redirectUrl } = await searchParams;

  return (
    <main className="flex min-h-[70vh] items-center justify-center p-6">
      <SignUp forceRedirectUrl={redirectUrl ?? '/'} />
    </main>
  );
}
