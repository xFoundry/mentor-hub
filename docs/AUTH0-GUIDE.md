# Auth0 Next.js SDK v4 Usage Guide

This guide documents the Auth0 integration for Mentor Hub 2.0 using the `@auth0/nextjs-auth0` SDK v4.

## Overview

Auth0 provides authentication and session management for the application. The SDK v4 uses:
- Server-side `Auth0Client` for session management
- Client-side `Auth0Provider` and `useUser()` hook
- **Middleware-based route handling** (no separate route handlers needed)

## Environment Setup

### Required Environment Variables

Create `.env.local` in the `mentor-hub-2/` directory:

```env
# Auth0 Configuration
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_SECRET=your-32-byte-hex-secret
APP_BASE_URL=http://localhost:3001

# Development Mode (optional)
NEXT_PUBLIC_USE_AUTH_MOCK=true
NEXT_PUBLIC_MOCK_USER_EMAIL=test@example.com
```

### Generating AUTH0_SECRET

```bash
openssl rand -hex 32
```

### Auth0 Dashboard Configuration

In your Auth0 application settings, add:

- **Allowed Callback URLs**: `http://localhost:3001/auth/callback`
- **Allowed Logout URLs**: `http://localhost:3001`
- **Allowed Web Origins**: `http://localhost:3001`

For production, add your production URLs to these lists.

---

## Auth0 Dashboard Setup Checklist

Complete these steps in the Auth0 Dashboard to fully configure authentication:

### Step 1: Create or Configure Application

1. Go to **Applications** → **Applications**
2. Select your existing xFoundry Hub application (or create new)
3. Ensure **Application Type** is set to **Regular Web Application**
4. Note your **Domain**, **Client ID**, and **Client Secret**

### Step 2: Configure Application URLs

In the application settings, configure:

```
Allowed Callback URLs:
http://localhost:3001/auth/callback
https://mentor-hub.yourdomain.com/auth/callback

Allowed Logout URLs:
http://localhost:3001
https://mentor-hub.yourdomain.com

Allowed Web Origins:
http://localhost:3001
https://mentor-hub.yourdomain.com
```

### Step 3: Enable Google Social Connection

1. Go to **Authentication** → **Social**
2. Click **Google** (or **Create Connection** → **Google**)
3. Configure:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console
4. Enable for your application in the **Applications** tab
5. Set required attributes: `email`, `profile`

**To get Google credentials:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project or select existing
3. Go to **APIs & Services** → **Credentials**
4. Create **OAuth 2.0 Client ID** (Web application)
5. Add authorized redirect URI: `https://YOUR_AUTH0_DOMAIN/login/callback`

### Step 4: Enable Passwordless (Email) Connection

1. Go to **Authentication** → **Passwordless**
2. Click **Email** to enable
3. Configure:
   - **From**: Your sender email (e.g., `noreply@yourdomain.com`)
   - **Subject**: "Your Mentor Hub Login Link"
   - **Message**: Customize the email template
4. In **Settings** tab:
   - Enable **OTP** or **Magic Link** (recommended: Magic Link)
   - Set **OTP Expiry**: 600 seconds (10 minutes)
5. In **Applications** tab, enable for your application

### Step 5: Configure Email Provider (Required for Passwordless)

1. Go to **Branding** → **Email Provider**
2. Choose provider:
   - **Auth0 Default** (limited, for testing only)
   - **SendGrid** (recommended)
   - **Amazon SES**
   - **Mailgun**
   - **Custom SMTP**
3. Configure credentials for your chosen provider

**For SendGrid:**
```
API Key: SG.xxxxxxxxxxxxx
From: noreply@yourdomain.com
From Name: Mentor Hub
```

### Step 6: Customize Universal Login (Optional)

1. Go to **Branding** → **Universal Login**
2. Enable **New Universal Login Experience**
3. Customize:
   - **Logo**: Upload your logo
   - **Primary Color**: Match your brand
   - **Background Color**: Match your brand
4. Go to **Advanced Options** to customize further

### Step 7: Configure Tenant Settings

1. Go to **Settings** (gear icon)
2. In **General**:
   - Set **Friendly Name**: "Mentor Hub"
   - Set **Support Email**: Your support email
3. In **Advanced**:
   - Enable **Enable Seamless SSO** (if using multiple apps)

### Step 8: Test Your Configuration

1. Set `NEXT_PUBLIC_USE_AUTH_MOCK=false` in `.env.local`
2. Restart your development server
3. Navigate to `/login`
4. Test both Google Sign-In and Passwordless Email

---

## Connection-Specific Login URLs

The login page supports direct connection URLs via query parameters:

```
# Google Sign-In
/auth/login?connection=google-oauth2&returnTo=/dashboard

# Passwordless Email
/auth/login?connection=email&login_hint=user@example.com&returnTo=/dashboard

# Default (shows Auth0 Universal Login)
/auth/login?returnTo=/dashboard
```

## Architecture (SDK v4)

In SDK v4, **there are no route handlers**. The middleware handles all auth routes automatically.

### File Structure

```
src/
├── lib/
│   ├── auth0.ts          # Auth0Client configuration
│   └── auth-mock.ts      # Development mock user
├── middleware.ts         # Route protection AND auth route handling
├── components/
│   └── providers.tsx     # Auth0Provider wrapper
└── hooks/
    ├── use-user-type.ts  # User role detection
    └── use-effective-user.ts # Impersonation-aware user context
```

### Auth0Client (`lib/auth0.ts`)

The server-side Auth0 client handles session management:

```typescript
import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { NextResponse } from "next/server";

export const auth0 = new Auth0Client({
  domain: process.env.AUTH0_DOMAIN,
  clientId: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  secret: process.env.AUTH0_SECRET,
  appBaseUrl: process.env.APP_BASE_URL || "http://localhost:3000",

  session: {
    rolling: true,
    absoluteDuration: 60 * 60 * 24, // 24 hours
    inactivityDuration: 60 * 60 * 2, // 2 hours
  },

  authorizationParameters: {
    scope: "openid profile email",
  },

  // Callback hook for custom logic after authentication
  async onCallback(error, context, session) {
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${error.message}`, process.env.APP_BASE_URL)
      );
    }
    return NextResponse.redirect(
      new URL(context.returnTo || "/dashboard", process.env.APP_BASE_URL)
    );
  },
});
```

### Middleware (`middleware.ts`)

The middleware handles both auth routes AND route protection:

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth0 } from "@/lib/auth0";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip Auth0 in mock mode
  if (process.env.NEXT_PUBLIC_USE_AUTH_MOCK === "true") {
    return NextResponse.next();
  }

  // Let Auth0 middleware handle the request
  const authRes = await auth0.middleware(request);

  // Auth0 handles /auth/* routes automatically
  if (pathname.startsWith("/auth")) {
    return authRes;
  }

  // Check session for protected routes
  const session = await auth0.getSession(request);
  if (!session && isProtectedRoute(pathname)) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  return authRes;
}
```

## Authentication Routes

Auth0 SDK v4 automatically handles these routes via middleware:

| Route | Purpose |
|-------|---------|
| `/auth/login` | Initiates login flow |
| `/auth/callback` | Handles OAuth callback |
| `/auth/logout` | Logs out user |

### Important: Use `<a>` Tags, Not `<Link>`

For auth routes, always use regular `<a>` tags to prevent client-side routing issues:

```tsx
// Correct
<a href="/auth/login">Log in</a>
<a href="/auth/logout">Log out</a>

// Incorrect - may cause issues
<Link href="/auth/login">Log in</Link>
```

## Server-Side Usage

### Getting Session in Server Components

```typescript
import { auth0 } from "@/lib/auth0";

export default async function ProtectedPage() {
  const session = await auth0.getSession();

  if (!session) {
    redirect("/login");
  }

  return <div>Welcome, {session.user.email}</div>;
}
```

### Getting Session in API Routes

```typescript
import { auth0 } from "@/lib/auth0";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth0.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ user: session.user });
}
```

## Client-Side Usage

### Auth0Provider

The app wraps children with `Auth0Provider` in `providers.tsx`:

```typescript
import { Auth0Provider } from "@auth0/nextjs-auth0/client";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Auth0Provider>
      {/* other providers */}
      {children}
    </Auth0Provider>
  );
}
```

### useUser Hook

Get user info in client components:

```typescript
"use client";
import { useUser } from "@auth0/nextjs-auth0/client";

export function Profile() {
  const { user, isLoading, error } = useUser();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!user) return <div>Not logged in</div>;

  return <div>{user.email}</div>;
}
```

## Development Mock Mode

Enable mock mode to develop without Auth0 credentials:

```env
NEXT_PUBLIC_USE_AUTH_MOCK=true
NEXT_PUBLIC_MOCK_USER_EMAIL=aonufrak@umd.edu
```

The mock system (`lib/auth-mock.ts`) provides:
- `isAuthMockEnabled()`: Check if mock is active
- `MOCK_USER`: Pre-configured mock user object
- `getMockUser()`: Get mock user if enabled

### How Mock Mode Works

1. `useUserType()` hook checks `isAuthMockEnabled()`
2. If enabled, uses `MOCK_USER.email` instead of Auth0 user
3. All BaseQL queries use the mock email
4. Middleware allows access to protected routes

## User Role Detection

The `useUserType()` hook determines user role from BaseQL participation records:

```typescript
import { useUserType } from "@/hooks/use-user-type";

function Component() {
  const { userType, userContext, isLoading, error } = useUserType();

  // userType: "student" | "mentor" | "staff" | null
  // userContext: Full user context with email, cohort, etc.
}
```

### Impersonation Support

Use `useEffectiveUser()` for impersonation-aware user context:

```typescript
import { useEffectiveUser } from "@/hooks/use-effective-user";

function Component() {
  const {
    userType,       // Effective (possibly impersonated) type
    userContext,    // Effective user context
    isImpersonated, // Whether currently impersonating
    realUserType,   // Real authenticated user's type
  } = useEffectiveUser();
}
```

## Middleware Protection

The middleware (`middleware.ts`) protects routes:

```typescript
// Protected routes
const protectedPaths = [
  "/dashboard",
  "/sessions",
  "/tasks",
  "/teams",
  "/mentors",
  "/students",
  "/feedback",
  "/settings",
  "/impersonate",
];
```

In mock mode, middleware allows access. In production, it uses Auth0 middleware.

## Common Patterns

### Conditional Rendering by Auth State

```typescript
"use client";
import { useUser } from "@auth0/nextjs-auth0/client";

export function AuthButton() {
  const { user, isLoading } = useUser();

  if (isLoading) return <Skeleton />;

  return user ? (
    <a href="/auth/logout">Logout</a>
  ) : (
    <a href="/auth/login">Login</a>
  );
}
```

### Protecting Client Components

```typescript
"use client";
import { useUserType } from "@/hooks/use-user-type";
import { redirect } from "next/navigation";

export function StaffOnly({ children }: { children: React.ReactNode }) {
  const { userType, isLoading } = useUserType();

  if (isLoading) return <Loading />;
  if (userType !== "staff") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
```

### Role-Based Navigation

```typescript
import { useEffectiveUser } from "@/hooks/use-effective-user";

export function Navigation() {
  const { userType, realUserType } = useEffectiveUser();

  // Use userType for showing role-specific nav
  const navItems = getNavItems(userType);

  // Use realUserType for admin controls (even when impersonating)
  const showAdminControls = realUserType === "staff";
}
```

## Troubleshooting

### "useUser" Returns Null

1. Ensure `Auth0Provider` wraps your component tree
2. Check that environment variables are set
3. Verify Auth0 Dashboard URLs are configured

### Redirect Loop on Login

1. Verify callback URL matches Auth0 Dashboard exactly
2. Check `APP_BASE_URL` matches your actual URL (including port!)
3. Ensure no trailing slashes in URLs

### Session Not Persisting

1. Check `AUTH0_SECRET` is set and stable
2. Verify cookies are enabled in browser
3. Check for HTTPS in production (required for secure cookies)

### Mock Mode Not Working

1. Ensure `NEXT_PUBLIC_USE_AUTH_MOCK=true` (exact string)
2. Verify mock email exists in BaseQL contacts
3. Check browser console for mock mode logs

## Security Best Practices

1. **Never expose secrets**: Keep `AUTH0_CLIENT_SECRET` server-side only
2. **Use HTTPS in production**: Required for secure session cookies
3. **Validate redirect URLs**: Use relative URLs when possible
4. **Session timeouts**: Configure appropriate timeout values
5. **Scope minimization**: Only request necessary OAuth scopes

## Related Files

- `/lib/auth0.ts` - Auth0Client configuration
- `/lib/auth-mock.ts` - Development mock
- `/middleware.ts` - Route protection + auth route handling
- `/components/providers.tsx` - Provider setup
- `/hooks/use-user-type.ts` - Role detection
- `/hooks/use-effective-user.ts` - Impersonation support
- `/contexts/impersonation-context.tsx` - Staff impersonation
