"use client";

import { usePathname } from "next/navigation";
import { TourProvider } from "./tour-provider";
import { TipCard } from "./tip-card";
import { WelcomeDialog } from "./welcome-dialog";
import { getPageTips } from "./content";
import { useOnboardingSafe } from "@/contexts/onboarding-context";
import type { OnboardingUserType } from "@/types/onboarding";

interface PageTourWrapperProps {
  /** Children to render */
  children: React.ReactNode;
  /** User type for filtering */
  userType: OnboardingUserType;
  /** User's first name for welcome dialog */
  userName?: string;
  /** Show welcome dialog (default: true on dashboard) */
  showWelcome?: boolean;
  /** Show welcome tip card (default: true) */
  showWelcomeTip?: boolean;
}

/**
 * PageTourWrapper - Wraps page content with tour and tips
 *
 * Automatically looks up the page's tour config based on pathname
 * and renders the appropriate tour provider and tips.
 *
 * Usage:
 * ```tsx
 * <PageTourWrapper userType="student" userName="John">
 *   <YourPageContent />
 * </PageTourWrapper>
 * ```
 */
export function PageTourWrapper({
  children,
  userType,
  userName,
  showWelcome = false,
  showWelcomeTip = true,
}: PageTourWrapperProps) {
  const pathname = usePathname();
  const { showTips } = useOnboardingSafe();

  // Get page config based on current path
  const pageConfig = getPageTips(pathname);

  // If no config for this page, just render children
  if (!pageConfig) {
    return <>{children}</>;
  }

  // Find welcome tip (first high-priority card tip)
  const welcomeTip = showWelcomeTip && showTips
    ? pageConfig.tips.find(
        (t) =>
          t.variant === "card" &&
          t.priority === "high" &&
          t.userTypes.includes(userType)
      )
    : null;

  // Content with optional welcome tip
  const content = (
    <div className="space-y-6">
      {/* Welcome Dialog - only on dashboard for first visit */}
      {showWelcome && (
        <WelcomeDialog userType={userType} userName={userName} />
      )}

      {/* Welcome Tip Card */}
      {welcomeTip && <TipCard tip={welcomeTip} userType={userType} />}

      {/* Page content */}
      {children}
    </div>
  );

  // Wrap with tour provider if tour is defined
  if (pageConfig.tour && pageConfig.tour.userTypes.includes(userType)) {
    return (
      <TourProvider tour={pageConfig.tour} userType={userType}>
        {content}
      </TourProvider>
    );
  }

  return content;
}
