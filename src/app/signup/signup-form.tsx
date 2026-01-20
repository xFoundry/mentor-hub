"use client";

import { useState, use, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  UserCheck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

interface SignupFormProps {
  searchParams: Promise<{
    email?: string;
    verified?: string;
  }>;
}

interface ContactInfo {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  hasParticipation: boolean;
}

type SignupStep = "verify" | "verified" | "not-found" | "already-registered";

/**
 * Signup Form Component
 *
 * Two-step signup process:
 * 1. Verify email exists in BaseQL (only pre-approved users can sign up)
 * 2. If verified, allow them to create an Auth0 account
 *
 * Accepts pre-verified email from login page redirect
 */
export function SignupForm({ searchParams }: SignupFormProps) {
  const params = use(searchParams);
  const router = useRouter();

  // Check if redirected from login with verified email (in BaseQL but no Auth0 account)
  const preVerifiedEmail = params.verified === "true" ? params.email : null;

  const [email, setEmail] = useState(preVerifiedEmail || "");
  const [step, setStep] = useState<SignupStep>(preVerifiedEmail ? "verified" : "verify");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);

  const fetchContactInfo = useCallback(async (emailToVerify: string) => {
    try {
      const response = await fetch("/api/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToVerify.toLowerCase().trim() }),
      });
      const data = await response.json();
      if (data.exists && data.contact) {
        setContactInfo(data.contact);
      }
    } catch (err) {
      console.error("Failed to fetch contact info:", err);
    }
  }, []);

  // If we have a pre-verified email from login redirect, fetch contact info
  useEffect(() => {
    if (preVerifiedEmail && !contactInfo) {
      fetchContactInfo(preVerifiedEmail);
    }
  }, [preVerifiedEmail, contactInfo, fetchContactInfo]);

  // Validate email format
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle email verification
  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to verify email");
      }

      if (data.exists) {
        setContactInfo(data.contact);
        if (data.hasAuth0Account) {
          // User already has an Auth0 account - should sign in instead
          setStep("already-registered");
        } else {
          // User is in BaseQL but not Auth0 - can sign up
          setStep("verified");
        }
      } else {
        setStep("not-found");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google signup
  const handleGoogleSignup = () => {
    const signupUrl = new URL("/auth/login", window.location.origin);
    signupUrl.searchParams.set("connection", "google-oauth2");
    signupUrl.searchParams.set("screen_hint", "signup");
    signupUrl.searchParams.set("login_hint", email);
    signupUrl.searchParams.set("returnTo", "/dashboard");
    window.location.href = signupUrl.toString();
  };

  // Handle passwordless signup
  const handlePasswordlessSignup = () => {
    const signupUrl = new URL("/auth/login", window.location.origin);
    signupUrl.searchParams.set("connection", "email");
    signupUrl.searchParams.set("login_hint", email);
    signupUrl.searchParams.set("returnTo", "/dashboard");
    window.location.href = signupUrl.toString();
  };

  // Reset to start
  const handleReset = () => {
    setStep("verify");
    setEmail("");
    setContactInfo(null);
    setError(null);
    // Clear URL params
    router.replace("/signup");
  };

  // Step 1: Email verification form
  if (step === "verify") {
    return (
      <Card className="border-0 shadow-none lg:shadow-sm lg:border">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription className="text-base">
            Enter your email to verify your profile
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleVerifyEmail} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                className="h-12"
                disabled={isLoading}
                autoComplete="email"
                autoFocus
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 text-base font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  Verify my email
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            We&apos;ll check if you&apos;re already in our system.
            <br />
            Only pre-approved members can create accounts.
          </p>

          <Separator />

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  // Step 2a: Email verified - show signup options
  if (step === "verified" && contactInfo) {
    return (
      <Card className="border-0 shadow-none lg:shadow-sm lg:border">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <UserCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl">Welcome, {contactInfo.firstName}!</CardTitle>
          <CardDescription className="text-base">
            Your profile has been verified. Choose how to create your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Signing up as</p>
            <p className="font-medium">{contactInfo.fullName}</p>
            <p className="text-sm text-muted-foreground">{contactInfo.email}</p>
          </div>

          {/* Google Sign-Up */}
          <Button
            variant="outline"
            className="w-full h-12 text-base font-medium"
            onClick={handleGoogleSignup}
          >
            <GoogleIcon className="mr-3 h-5 w-5" />
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Passwordless Email */}
          <Button
            className="w-full h-12 text-base font-medium"
            onClick={handlePasswordlessSignup}
          >
            <Mail className="mr-2 h-5 w-5" />
            Sign up with Code
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            We&apos;ll send a code to <strong>{contactInfo.email}</strong>
          </p>

          <Separator />

          <Button
            variant="ghost"
            className="w-full"
            onClick={handleReset}
          >
            Use a different email
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Step 2b: Email not found in BaseQL
  if (step === "not-found") {
    return (
      <Card className="border-0 shadow-none lg:shadow-sm lg:border">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <XCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle className="text-2xl">Profile not found</CardTitle>
          <CardDescription className="text-base">
            We couldn&apos;t find a profile for <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Only pre-approved members can create accounts. If you believe this is an error,
              please contact your program administrator to be added to the system.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleReset}
            >
              Try a different email
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              asChild
            >
              <Link href="/login">Back to sign in</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step 2c: User already has an Auth0 account
  if (step === "already-registered" && contactInfo) {
    return (
      <Card className="border-0 shadow-none lg:shadow-sm lg:border">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl">Welcome back, {contactInfo.firstName}!</CardTitle>
          <CardDescription className="text-base">
            You already have an account. Please sign in instead.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Account found for</p>
            <p className="font-medium">{contactInfo.fullName}</p>
            <p className="text-sm text-muted-foreground">{contactInfo.email}</p>
          </div>

          <Button
            className="w-full h-12 text-base font-medium"
            asChild
          >
            <Link href={`/login?email=${encodeURIComponent(contactInfo.email)}&verified=true`}>
              Go to sign in
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>

          <Separator />

          <Button
            variant="ghost"
            className="w-full"
            onClick={handleReset}
          >
            Use a different email
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}

/**
 * Google Icon SVG
 */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
