"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Redirect to sessions page with create dialog open.
 * This preserves backwards compatibility with direct links to /sessions/new.
 */
export default function NewSessionPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/sessions?create=true");
  }, [router]);

  // Show nothing while redirecting
  return null;
}
