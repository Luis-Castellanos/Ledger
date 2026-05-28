import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <AuthSetupFallback title="Sign up unavailable" />;
  }

  return (
    <main className="auth-page">
      <SignUp />
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
