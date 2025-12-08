"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserType } from "@/hooks/use-user-type";

/**
 * Admin page redirects to email management by default
 */
export default function AdminPage() {
  const router = useRouter();
  const { userType, isLoading } = useUserType();

  useEffect(() => {
    if (!isLoading) {
      if (userType !== "staff") {
        router.push("/dashboard");
      } else {
        router.push("/admin/emails");
      }
    }
  }, [userType, isLoading, router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}
