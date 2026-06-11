import { SignIn } from "@clerk/nextjs";
import { AuthShell, clerkAppearance } from "@/components/auth-shell";

export default function SignInPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <AuthSetupFallback title="Sign in unavailable" />;
  }

  return (
    <AuthShell>
      <SignIn appearance={clerkAppearance} />
    </AuthShell>
  );
}

function AuthSetupFallback({ title }: { title: string }) {
  return (
    <AuthShell>
      <section className="max-w-sm text-center">
        <p className="label-caps">Clerk</p>
        <h1 className="mt-1 font-display text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Add Clerk keys to `.env.local` to enable authentication.</p>
      </section>
    </AuthShell>
  );
}
