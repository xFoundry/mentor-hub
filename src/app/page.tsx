/**
 * Home Page
 *
 * This page should never render - middleware redirects:
 * - Authenticated users → /dashboard
 * - Unauthenticated users → /login
 *
 * This is just a fallback in case middleware doesn't catch it.
 */
export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 text-lg">Loading...</div>
        <div className="text-muted-foreground text-sm">Redirecting...</div>
      </div>
    </div>
  );
}
