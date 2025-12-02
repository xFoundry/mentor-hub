"use client";

import { Auth0Provider } from "@auth0/nextjs-auth0/client";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { SWRProvider } from "@/lib/swr-config";
import { FeedbackDialogProvider } from "@/contexts/feedback-dialog-context";
import { FeedbackDialog } from "@/components/feedback/feedback-dialog";
import { ImpersonationProvider } from "@/contexts/impersonation-context";
import { useUserType } from "@/hooks/use-user-type";

/**
 * Inner provider wrapper that can use hooks
 * Provides ImpersonationProvider with user context
 */
function ImpersonationWrapper({ children }: { children: React.ReactNode }) {
  const { userType, userContext } = useUserType();

  return (
    <ImpersonationProvider
      staffUserType={userType}
      staffUserContext={userContext}
    >
      {children}
    </ImpersonationProvider>
  );
}

/**
 * Application Providers
 *
 * Wraps the app with necessary context providers:
 * - Auth0Provider: Auth0 client-side authentication context
 * - SWRProvider: SWR global configuration
 * - ThemeProvider: Dark/light mode theme management
 * - ImpersonationProvider: Staff impersonation functionality
 * - FeedbackDialogProvider: Global feedback dialog state
 * - Toaster: Toast notifications
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Auth0Provider>
      <SWRProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ImpersonationWrapper>
            <FeedbackDialogProvider>
              {children}
              <FeedbackDialog />
            </FeedbackDialogProvider>
          </ImpersonationWrapper>
          <Toaster />
        </ThemeProvider>
      </SWRProvider>
    </Auth0Provider>
  );
}
