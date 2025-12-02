import { redirect } from "next/navigation";
import Image from "next/image";
import { isAuthMockEnabled } from "@/lib/auth-mock";
import { SignupForm } from "./signup-form";

interface SignupPageProps {
  searchParams: Promise<{
    email?: string;
    verified?: string;
  }>;
}

/**
 * Signup Page
 *
 * In production: Verifies user exists in BaseQL before allowing Auth0 signup
 * In development (mock mode): Automatically redirects to dashboard
 */
export default function SignupPage({ searchParams }: SignupPageProps) {
  // If auth mock is enabled, redirect directly to dashboard
  if (isAuthMockEnabled()) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-primary-foreground">
          <div className="flex items-center gap-3">
            <div className="bg-primary-foreground/20 flex aspect-square size-10 items-center justify-center rounded-lg p-2">
              <Image
                src="/x-icon-white.png"
                alt="xFoundry Logo"
                width={24}
                height={24}
              />
            </div>
            <span className="text-xl font-semibold">Mentor Hub</span>
          </div>

          <div className="space-y-6">
            <h1 className="text-4xl font-bold leading-tight">
              Join your cohort
            </h1>
            <p className="text-lg text-primary-foreground/80 max-w-md">
              Create your account to access your mentorship dashboard,
              track your progress, and connect with your team.
            </p>
            <div className="flex flex-col gap-4 pt-4">
              <Feature text="Access your personalized dashboard" />
              <Feature text="Connect with mentors and team members" />
              <Feature text="Track sessions and action items" />
            </div>
          </div>

          <p className="text-sm text-primary-foreground/60">
            Part of the xFoundry ecosystem
          </p>
        </div>

        {/* Decorative elements */}
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-primary-foreground/5 rounded-full" />
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-primary-foreground/5 rounded-full" />
      </div>

      {/* Right side - Signup form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="bg-primary flex aspect-square size-10 items-center justify-center rounded-lg p-2">
              <Image
                src="/x-icon-white.png"
                alt="xFoundry Logo"
                width={24}
                height={24}
              />
            </div>
            <span className="text-xl font-semibold">Mentor Hub</span>
          </div>

          <SignupForm searchParams={searchParams} />
        </div>
      </div>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 w-2 rounded-full bg-primary-foreground/60" />
      <span className="text-primary-foreground/80">{text}</span>
    </div>
  );
}
