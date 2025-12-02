"use client";

import { SWRConfig } from "swr";

/**
 * Global SWR Configuration
 *
 * Provides default settings for all SWR hooks in the application:
 * - Revalidation behavior
 * - Error retry logic
 * - Cache management
 */
export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        // Revalidate on focus
        revalidateOnFocus: true,

        // Revalidate on reconnect
        revalidateOnReconnect: true,

        // Dedupe requests within 2 seconds
        dedupingInterval: 2000,

        // Retry on error
        shouldRetryOnError: true,
        errorRetryCount: 3,
        errorRetryInterval: 5000,

        // Keep previous data when revalidating
        keepPreviousData: true,

        // Default fetcher (not needed since we use custom fetchers)
        // fetcher: (url: string) => fetch(url).then(res => res.json()),
      }}
    >
      {children}
    </SWRConfig>
  );
}
