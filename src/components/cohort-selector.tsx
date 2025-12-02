"use client";

import { useUserType } from "@/hooks/use-user-type";
import { useCohorts } from "@/hooks/use-cohorts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface CohortSelectorProps {
  value?: string;
  onValueChange: (cohortId: string) => void;
  placeholder?: string;
  includeAll?: boolean;
}

export function CohortSelector({
  value,
  onValueChange,
  placeholder = "Select cohort...",
  includeAll = true,
}: CohortSelectorProps) {
  const { userType, userContext } = useUserType();
  const { cohorts, isLoading } = useCohorts();

  // Only show for staff users
  if (userType !== "staff") {
    return null;
  }

  if (isLoading) {
    return <Skeleton className="h-10 w-[200px]" />;
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeAll && (
          <SelectItem value="all">All Cohorts</SelectItem>
        )}
        {cohorts.map((cohort: any) => (
          <SelectItem key={cohort.id} value={cohort.id}>
            {cohort.displayName || cohort.shortName || `Cohort ${cohort.cohortNumber}`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
