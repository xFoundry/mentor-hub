"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { Session } from "@/types/schema";
import { LocationSelector } from "./location-selector";

const SESSION_TYPES = [
  { value: "Team Check-in", label: "Team Check-in" },
  { value: "Office Hours", label: "Office Hours" },
  { value: "1-on-1", label: "1-on-1" },
  { value: "Workshop", label: "Workshop" },
  { value: "Guest Lecture", label: "Guest Lecture" },
  { value: "Judging", label: "Judging" },
];

const SESSION_STATUSES = [
  { value: "Scheduled", label: "Scheduled" },
  { value: "In Progress", label: "In Progress" },
  { value: "Completed", label: "Completed" },
  { value: "Cancelled", label: "Cancelled" },
  { value: "No-Show", label: "No-Show" },
];

const MEETING_PLATFORMS = [
  { value: "Zoom", label: "Zoom" },
  { value: "Google Meet", label: "Google Meet" },
  { value: "Teams", label: "Microsoft Teams" },
  { value: "In-Person", label: "In-Person" },
  { value: "Cal.com", label: "Cal.com" },
  { value: "Daily.co", label: "Daily.co" },
  { value: "Other", label: "Other" },
];

const DURATION_OPTIONS = [
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "60 minutes" },
  { value: "90", label: "90 minutes" },
  { value: "120", label: "2 hours" },
];

interface EditSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session;
  onSave: (updates: {
    sessionType?: string;
    scheduledStart?: string;
    duration?: number;
    status?: string;
    meetingPlatform?: string;
    meetingUrl?: string;
    locationId?: string;
    agenda?: string;
  }) => Promise<void>;
}

export function EditSessionDialog({
  open,
  onOpenChange,
  session,
  onSave,
}: EditSessionDialogProps) {
  // Parse scheduledStart into date and time
  // Strip timezone indicator to treat as local time (Airtable may add 'Z')
  const parseDateTime = (isoString?: string) => {
    if (!isoString) return { date: "", time: "" };
    try {
      // Remove timezone indicators to treat as local time
      const localStr = isoString.replace(/Z$/, '').replace(/[+-]\d{2}:\d{2}$/, '');
      const parsed = parseISO(localStr);
      return {
        date: format(parsed, "yyyy-MM-dd"),
        time: format(parsed, "HH:mm"),
      };
    } catch {
      return { date: "", time: "" };
    }
  };

  const initialDateTime = parseDateTime(session.scheduledStart);

  // Form state
  const [sessionType, setSessionType] = useState(session.sessionType || "");
  const [status, setStatus] = useState(session.status || "Scheduled");
  const [scheduledDate, setScheduledDate] = useState(initialDateTime.date);
  const [scheduledTime, setScheduledTime] = useState(initialDateTime.time);
  const [duration, setDuration] = useState(String(session.duration || 60));
  const [meetingPlatform, setMeetingPlatform] = useState(session.meetingPlatform || "");
  const [meetingUrl, setMeetingUrl] = useState(session.meetingUrl || "");
  const [locationId, setLocationId] = useState(session.locations?.[0]?.id || "");
  const [agenda, setAgenda] = useState(session.agenda || "");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when session changes or dialog opens
  useEffect(() => {
    if (open) {
      const dateTime = parseDateTime(session.scheduledStart);
      setSessionType(session.sessionType || "");
      setStatus(session.status || "Scheduled");
      setScheduledDate(dateTime.date);
      setScheduledTime(dateTime.time);
      setDuration(String(session.duration || 60));
      setMeetingPlatform(session.meetingPlatform || "");
      setMeetingUrl(session.meetingUrl || "");
      setLocationId(session.locations?.[0]?.id || "");
      setAgenda(session.agenda || "");
      setErrors({});
    }
  }, [open, session]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!sessionType) {
      newErrors.sessionType = "Session type is required";
    }
    if (!scheduledDate) {
      newErrors.scheduledDate = "Date is required";
    }
    if (!scheduledTime) {
      newErrors.scheduledTime = "Time is required";
    }
    if (meetingUrl && !isValidUrl(meetingUrl)) {
      newErrors.meetingUrl = "Please enter a valid URL";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string: string): boolean => {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const updates: Record<string, any> = {};

      // Combine date and time into scheduledStart
      const newScheduledStart = `${scheduledDate}T${scheduledTime}:00`;
      const originalDateTime = parseDateTime(session.scheduledStart);
      const originalScheduledStart = originalDateTime.date && originalDateTime.time
        ? `${originalDateTime.date}T${originalDateTime.time}:00`
        : "";

      // Only include changed fields
      if (sessionType !== session.sessionType) {
        updates.sessionType = sessionType;
      }
      if (status !== session.status) {
        updates.status = status;
      }
      if (newScheduledStart !== originalScheduledStart) {
        updates.scheduledStart = newScheduledStart;
      }
      if (parseInt(duration) !== session.duration) {
        updates.duration = parseInt(duration);
      }
      if (meetingPlatform !== (session.meetingPlatform || "")) {
        updates.meetingPlatform = meetingPlatform || undefined;
      }
      if (meetingUrl !== (session.meetingUrl || "")) {
        updates.meetingUrl = meetingUrl || undefined;
      }
      // Handle location changes
      const currentLocationId = session.locations?.[0]?.id || "";
      if (meetingPlatform === "In-Person") {
        if (locationId !== currentLocationId) {
          updates.locationId = locationId || undefined;
        }
      } else if (currentLocationId) {
        // Clear location if switching away from In-Person
        updates.locationId = undefined;
      }
      if (agenda !== (session.agenda || "")) {
        updates.agenda = agenda || undefined;
      }

      // Only call save if there are changes
      if (Object.keys(updates).length > 0) {
        await onSave(updates);
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Error updating session:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Session</DialogTitle>
          <DialogDescription>
            Update the session details. Changes will be saved immediately.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Session Type */}
          <div className="space-y-2">
            <Label htmlFor="sessionType">
              Session Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={sessionType}
              onValueChange={setSessionType}
              disabled={isSubmitting}
            >
              <SelectTrigger id="sessionType">
                <SelectValue placeholder="Select session type" />
              </SelectTrigger>
              <SelectContent>
                {SESSION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.sessionType && (
              <p className="text-sm text-destructive">{errors.sessionType}</p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as typeof status)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SESSION_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date and Time */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">
                Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                disabled={isSubmitting}
              />
              {errors.scheduledDate && (
                <p className="text-sm text-destructive">{errors.scheduledDate}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">
                Time <span className="text-destructive">*</span>
              </Label>
              <Input
                id="time"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                disabled={isSubmitting}
              />
              {errors.scheduledTime && (
                <p className="text-sm text-destructive">{errors.scheduledTime}</p>
              )}
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duration</Label>
            <Select
              value={duration}
              onValueChange={setDuration}
              disabled={isSubmitting}
            >
              <SelectTrigger id="duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Meeting Platform */}
          <div className="space-y-2">
            <Label htmlFor="platform">Meeting Platform</Label>
            <Select
              value={meetingPlatform || undefined}
              onValueChange={(value) => {
                setMeetingPlatform(value);
                // Clear location when switching away from In-Person
                if (value !== "In-Person") {
                  setLocationId("");
                }
              }}
              disabled={isSubmitting}
            >
              <SelectTrigger id="platform">
                <SelectValue placeholder="Select platform (optional)" />
              </SelectTrigger>
              <SelectContent>
                {MEETING_PLATFORMS.map((platform) => (
                  <SelectItem key={platform.value} value={platform.value}>
                    {platform.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location (for In-Person meetings) */}
          {meetingPlatform === "In-Person" && (
            <div className="space-y-2">
              <Label>Location</Label>
              <LocationSelector
                value={locationId}
                onValueChange={setLocationId}
                disabled={isSubmitting}
              />
            </div>
          )}

          {/* Meeting URL */}
          <div className="space-y-2">
            <Label htmlFor="meetingUrl">Meeting URL</Label>
            <Input
              id="meetingUrl"
              type="url"
              placeholder="https://..."
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              disabled={isSubmitting}
            />
            {errors.meetingUrl && (
              <p className="text-sm text-destructive">{errors.meetingUrl}</p>
            )}
          </div>

          {/* Agenda */}
          <div className="space-y-2">
            <Label htmlFor="agenda">Agenda</Label>
            <Textarea
              id="agenda"
              placeholder="Session agenda and topics to cover..."
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
