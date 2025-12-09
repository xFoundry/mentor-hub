"use client";

import useSWR from "swr";

interface Capacity {
  id: string;
  name: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * Hook to fetch capacity options
 */
export function useCapacities() {
  const { data, error, isLoading } = useSWR<{ capacities: Capacity[] }>(
    "/api/capacities",
    fetcher
  );

  return {
    capacities: data?.capacities || [],
    isLoading,
    error,
  };
}
