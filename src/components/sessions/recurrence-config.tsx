"use client";

import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Repeat } from "lucide-react";
import type { RecurrenceConfig } from "@/types/recurring";
import { RECURRENCE_LIMITS } from "@/types/recurring";
import { generateOccurrences } from "@/lib/recurring/rrule-helpers";
import { formatAsEastern } from "@/lib/timezone";

interface RecurrenceConfigComponentProps {
  value: RecurrenceConfig | null;
  onChange: (config: RecurrenceConfig | null) => void;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
}

type EndType = "occurrences" | "date";

const FREQUENCY_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
] as const;

const OCCURRENCE_OPTIONS = [
  { value: "4", label: "4 sessions" },
  { value: "6", label: "6 sessions" },
  { value: "8", label: "8 sessions" },
  { value: "10", label: "10 sessions" },
  { value: "12", label: "12 sessions" },
  { value: "16", label: "16 sessions" },
  { value: "24", label: "24 sessions" },
  { value: "52", label: "52 sessions (1 year)" },
];

/**
 * Component for configuring session recurrence
 */
export function RecurrenceConfigComponent({
  value,
  onChange,
  startDate,
  startTime,
}: RecurrenceConfigComponentProps) {
  // Default values
  const frequency = value?.frequency || "weekly";
  const endType: EndType = value?.endDate ? "date" : "occurrences";
  const occurrences = value?.occurrences || 12;
  const endDate = value?.endDate || getDefaultEndDate(startDate);

  // Generate preview dates
  const previewDates = useMemo(() => {
    if (!startDate || !startTime) return [];

    try {
      // Combine date and time for the start
      const startDateTime = `${startDate}T${startTime}:00`;
      const config: RecurrenceConfig = {
        frequency,
        ...(endType === "occurrences" ? { occurrences } : { endDate }),
      };

      const dates = generateOccurrences(startDateTime, config);
      return dates.slice(0, 5); // Show first 5
    } catch {
      return [];
    }
  }, [startDate, startTime, frequency, endType, occurrences, endDate]);

  const totalCount = useMemo(() => {
    if (!startDate || !startTime) return 0;

    try {
      const startDateTime = `${startDate}T${startTime}:00`;
      const config: RecurrenceConfig = {
        frequency,
        ...(endType === "occurrences" ? { occurrences } : { endDate }),
      };

      return generateOccurrences(startDateTime, config).length;
    } catch {
      return 0;
    }
  }, [startDate, startTime, frequency, endType, occurrences, endDate]);

  const handleFrequencyChange = (newFrequency: RecurrenceConfig["frequency"]) => {
    onChange({
      frequency: newFrequency,
      ...(endType === "occurrences" ? { occurrences } : { endDate }),
    });
  };

  const handleEndTypeChange = (newEndType: EndType) => {
    if (newEndType === "occurrences") {
      onChange({ frequency, occurrences });
    } else {
      onChange({ frequency, endDate });
    }
  };

  const handleOccurrencesChange = (newOccurrences: string) => {
    const num = parseInt(newOccurrences);
    if (!isNaN(num) && num >= 2 && num <= RECURRENCE_LIMITS.MAX_OCCURRENCES) {
      onChange({ frequency, occurrences: num });
    }
  };

  const handleEndDateChange = (newEndDate: string) => {
    onChange({ frequency, endDate: newEndDate });
  };

  return (
    <div className="space-y-4">
      {/* Frequency */}
      <div className="space-y-2">
        <Label>Repeats</Label>
        <Select value={frequency} onValueChange={handleFrequencyChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FREQUENCY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* End Condition */}
      <div className="space-y-3">
        <Label>Ends</Label>
        <RadioGroup
          value={endType}
          onValueChange={(val) => handleEndTypeChange(val as EndType)}
          className="space-y-3"
        >
          {/* After X occurrences */}
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="occurrences" id="end-occurrences" />
            <Label
              htmlFor="end-occurrences"
              className="flex-1 flex items-center gap-2 font-normal cursor-pointer"
            >
              After
              <Select
                value={occurrences.toString()}
                onValueChange={handleOccurrencesChange}
                disabled={endType !== "occurrences"}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OCCURRENCE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Label>
          </div>

          {/* On date */}
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="date" id="end-date" />
            <Label
              htmlFor="end-date"
              className="flex-1 flex items-center gap-2 font-normal cursor-pointer"
            >
              On
              <Input
                type="date"
                value={endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                disabled={endType !== "date"}
                className="w-[160px]"
                min={startDate}
                max={getMaxEndDate(startDate)}
              />
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Preview */}
      {previewDates.length > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3 text-sm font-medium">
              <CalendarDays className="h-4 w-4" />
              Preview ({totalCount} sessions)
            </div>
            <div className="space-y-1">
              {previewDates.map((date, i) => (
                <div key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="w-4 text-center text-xs">{i + 1}.</span>
                  {formatAsEastern(date.toISOString(), "EEE, MMM d, yyyy")}
                </div>
              ))}
              {totalCount > 5 && (
                <div className="text-sm text-muted-foreground flex items-center gap-2 pt-1">
                  <span className="w-4" />
                  <span className="italic">...and {totalCount - 5} more</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Get default end date (12 weeks from start)
 */
function getDefaultEndDate(startDate: string): string {
  const date = new Date(startDate);
  date.setDate(date.getDate() + 12 * 7); // 12 weeks
  return date.toISOString().split("T")[0];
}

/**
 * Get maximum allowed end date
 */
function getMaxEndDate(startDate: string): string {
  const date = new Date(startDate);
  date.setDate(date.getDate() + RECURRENCE_LIMITS.MAX_DAYS_AHEAD);
  return date.toISOString().split("T")[0];
}

/**
 * Export a simple toggle component for the form
 */
export function RecurrenceToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onToggle(!enabled)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle(!enabled);
        }
      }}
      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
        enabled
          ? "border-primary bg-primary/5"
          : "border-dashed hover:border-muted-foreground/50"
      }`}
    >
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full ${
          enabled ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
      >
        <Repeat className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-sm">
          {enabled ? "Repeating session" : "Make this a repeating session"}
        </p>
        <p className="text-xs text-muted-foreground">
          {enabled
            ? "Configure recurrence below"
            : "Click to create multiple sessions at once"}
        </p>
      </div>
    </div>
  );
}
