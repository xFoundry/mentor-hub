"use client";

import { useState, use, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
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

interface LoginFormProps {
  searchParams: Promise<{
    error?: string;
    returnTo?: string;
    email?: string;
    verified?: string;
  }>;
}

interface ContactInfo {
  id: string;
  fullName: string;
  firstName: string;
  lastName?: string;
  email: string;
}

type LoginStep = "verify" | "signin";

/**
 * Login Form Component
 *
 * Two-step login process:
 * 1. Verify email exists in BaseQL (only registered users can sign in)
 * 2. If verified and has Auth0 account, show sign in options
 *    If verified but no Auth0 account, redirect to signup
 */
export function LoginForm({ searchParams }: LoginFormProps) {
  const params = use(searchParams);
  const router = useRouter();

  // Check if redirected from signup with verified email
  const preVerifiedEmail = params.verified === "true" ? params.email : null;

  const [email, setEmail] = useState(preVerifiedEmail || "");
  const [step, setStep] = useState<LoginStep>(preVerifiedEmail ? "signin" : "verify");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);

  const returnTo = params.returnTo || "/dashboard";

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

  // If we have a pre-verified email, fetch contact info
  useEffect(() => {
    if (preVerifiedEmail && !contactInfo) {
      fetchContactInfo(preVerifiedEmail);
    }
  }, [preVerifiedEmail, contactInfo, fetchContactInfo]);

  // Map Auth0 error codes to user-friendly messages
  const getErrorMessage = (error?: string) => {
    if (!error) return null;
    const errorMessages: Record<string, string> = {
      access_denied: "Access was denied. Please try again or contact support.",
      invalid_request: "Invalid request. Please try again.",
      unauthorized: "You are not authorized to access this application.",
      server_error: "A server error occurred. Please try again later.",
      temporarily_unavailable: "Service temporarily unavailable. Please try again.",
    };
    return errorMessages[error] || "An error occurred during sign in. Please try again.";
  };

  const errorMessage = getErrorMessage(params.error);

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

      if (!data.exists) {
        // Not in BaseQL - can't sign in
        setError("No account found with this email. Please sign up first.");
        return;
      }

      setContactInfo(data.contact);

      // Check Auth0 status
      if (data.hasAuth0Account === false) {
        // In BaseQL but NOT in Auth0 - redirect to signup
        router.push(`/signup?email=${encodeURIComponent(email)}&verified=true`);
        return;
      }

      // Has Auth0 account OR unknown (null) - proceed to sign in
      setStep("signin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google sign-in
  const handleGoogleSignIn = () => {
    const loginUrl = new URL("/auth/login", window.location.origin);
    loginUrl.searchParams.set("connection", "google-oauth2");
    loginUrl.searchParams.set("login_hint", email);
    loginUrl.searchParams.set("returnTo", returnTo);
    window.location.href = loginUrl.toString();
  };

  // Handle passwordless sign-in
  const handlePasswordlessSignIn = () => {
    const loginUrl = new URL("/auth/login", window.location.origin);
    loginUrl.searchParams.set("connection", "email");
    loginUrl.searchParams.set("login_hint", email);
    loginUrl.searchParams.set("returnTo", returnTo);
    window.location.href = loginUrl.toString();
  };

  // Reset to verification step
  const handleReset = () => {
    setStep("verify");
    setEmail("");
    setContactInfo(null);
    setError(null);
    // Clear URL params
    router.replace("/login");
  };

  // Step 1: Email verification
  if (step === "verify") {
    return (
      <Card className="border-0 shadow-none lg:shadow-sm lg:border">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription className="text-base">
            Enter your email to sign in
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {(errorMessage || error) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage || error}</AlertDescription>
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
                  Continue
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          <Separator />

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary hover:underline font-medium">
              Sign up
            </Link>
          </p>

          <Separator />

          <p className="text-center text-xs text-muted-foreground">
            By continuing, you agree to our{" "}
            <a href="#" className="underline hover:text-foreground">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="underline hover:text-foreground">
              Privacy Policy
            </a>
          </p>
        </CardContent>
      </Card>
    );
  }

  // Step 2: Sign in options
  return (
    <Card className="border-0 shadow-none lg:shadow-sm lg:border">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl">
          Welcome back{contactInfo?.firstName ? `, ${contactInfo.firstName}` : ""}!
        </CardTitle>
        <CardDescription className="text-base">
          Choose how you&apos;d like to sign in
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground">Signing in as</p>
          <p className="font-medium">{contactInfo?.fullName || email}</p>
          <p className="text-sm text-muted-foreground">{contactInfo?.email || email}</p>
        </div>

        {/* Google Sign-In */}
        <Button
          variant="outline"
          className="w-full h-12 text-base font-medium"
          onClick={handleGoogleSignIn}
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
          onClick={handlePasswordlessSignIn}
        >
          <Mail className="mr-2 h-5 w-5" />
          Login with Code
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          We&apos;ll send a code to{" "}
          <strong>{contactInfo?.email || email}</strong>
        </p>

        <Separator />

        <Button variant="ghost" className="w-full" onClick={handleReset}>
          Use a different email
        </Button>
      </CardContent>
    </Card>
  );
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
