"use client";

import { Check, ChevronDown, Users } from "lucide-react";
import { useCohortContext } from "@/contexts/cohort-context";
import { useCohorts } from "@/hooks/use-cohorts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

export function CohortHeaderDropdown() {
  const { selectedCohortId, setSelectedCohortId } = useCohortContext();
  const { cohorts, isLoading } = useCohorts();

  // Get the display name for the selected cohort
  const getSelectedCohortName = () => {
    if (selectedCohortId === "all") {
      return "All Cohorts";
    }

    const selectedCohort = cohorts?.find(
      (cohort) => cohort.id === selectedCohortId
    );

    if (!selectedCohort) {
      return "Select Cohort";
    }

    return (
      selectedCohort.displayName ||
      selectedCohort.shortName ||
      `Cohort ${selectedCohort.cohortNumber}`
    );
  };

  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <Skeleton className="h-10 w-full" />
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton>
              <Users />
              <span className="truncate">{getSelectedCohortName()}</span>
              <ChevronDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[--radix-popper-anchor-width]">
            <DropdownMenuItem
              onClick={() => setSelectedCohortId("all")}
              className="cursor-pointer"
            >
              <Check
                className={`mr-2 h-4 w-4 ${
                  selectedCohortId === "all" ? "opacity-100" : "opacity-0"
                }`}
              />
              <span>All Cohorts</span>
            </DropdownMenuItem>
            {cohorts?.map((cohort) => {
              const displayName =
                cohort.displayName ||
                cohort.shortName ||
                `Cohort ${cohort.cohortNumber}`;
              const isSelected = cohort.id === selectedCohortId;

              return (
                <DropdownMenuItem
                  key={cohort.id}
                  onClick={() => setSelectedCohortId(cohort.id)}
                  className="cursor-pointer"
                >
                  <Check
                    className={`mr-2 h-4 w-4 ${
                      isSelected ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  <span>{displayName}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
