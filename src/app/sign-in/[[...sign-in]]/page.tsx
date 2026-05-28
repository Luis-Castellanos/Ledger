import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <AuthSetupFallback title="Sign in unavailable" />;
  }

  return (
    <main className="auth-page">
      <SignIn />
    </main>
  );
}

function AuthSetupFallback({ title }: { title: string }) {
  return (
    <main className="auth-page">
      <section className="auth-fallback">
        <p className="panel-label">Clerk</p>
        <h1>{title}</h1>
        <p>Add Clerk keys to `.env.local` to enable authentication.</p>
      </section>
    </main>
  );
}
