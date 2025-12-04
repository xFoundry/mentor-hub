"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { getAllLocations, createLocation } from "@/lib/baseql";
import type { Location } from "@/types/schema";
import { toast } from "sonner";

/**
 * Hook to fetch and manage locations
 */
export function useLocations() {
  const [isCreating, setIsCreating] = useState(false);

  const { data, error, isLoading } = useSWR(
    ["/locations"],
    async () => {
      const result = await getAllLocations();
      return result.locations;
    },
    { revalidateOnFocus: false }
  );

  const addLocation = async (input: {
    name: string;
    building?: string;
    floor?: string;
    address?: string;
    accessInstructions?: string;
  }): Promise<Location | null> => {
    setIsCreating(true);
    try {
      const result = await createLocation(input);
      const newLocation = result.insert_locations;

      // Revalidate locations cache
      await mutate(["/locations"]);

      toast.success("Location added");
      return newLocation;
    } catch (err) {
      console.error("Failed to create location:", err);
      toast.error("Failed to add location");
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  return {
    locations: data || [],
    isLoading,
    error,
    addLocation,
    isCreating,
  };
}
