"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCohorts } from "@/hooks/use-cohorts";

type GroupByOption = "none" | "team" | "mentor";

interface DataViewControlsProps {
  selectedCohortId: string;
  onCohortChange: (cohortId: string) => void;
  groupBy: GroupByOption;
  onGroupByChange: (groupBy: GroupByOption) => void;
  showGroupBy?: boolean;
}

export function DataViewControls({
  selectedCohortId,
  onCohortChange,
  groupBy,
  onGroupByChange,
  showGroupBy = true,
}: DataViewControlsProps) {
  const { cohorts, isLoading: isCohortsLoading } = useCohorts();

  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex flex-wrap items-center gap-4">
          {/* Cohort Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground">
              Cohort:
            </label>
            <Select
              value={selectedCohortId}
              onValueChange={onCohortChange}
              disabled={isCohortsLoading}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select cohort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cohorts</SelectItem>
                {cohorts.map((cohort) => (
                  <SelectItem key={cohort.id} value={cohort.id}>
                    {cohort.displayName || cohort.shortName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Grouping Control */}
          {showGroupBy && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground">
                Group by:
              </label>
              <Select
                value={groupBy}
                onValueChange={(value) => onGroupByChange(value as GroupByOption)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Group by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="mentor">Mentor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
