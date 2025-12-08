import { Section, Text, Hr } from "@react-email/components";
import * as React from "react";
import { EmailLayout, EmailButton } from "./components";
import type { SessionChanges } from "@/lib/notifications/types";

interface SessionUpdateNotificationProps {
  recipientName: string;
  recipientRole: "student" | "mentor";
  sessionType: string;
  teamName: string;
  mentorName: string;
  sessionDate: string;
  sessionTime: string;
  changes: SessionChanges;
  sessionUrl: string;
}

/**
 * Session update notification email
 * Sent to participants when session details are updated (time, location, meeting URL)
 */
export function SessionUpdateNotificationEmail({
  recipientName,
  recipientRole,
  sessionType,
  teamName,
  mentorName,
  sessionDate,
  sessionTime,
  changes,
  sessionUrl,
}: SessionUpdateNotificationProps) {
  const changeCount = Object.keys(changes).filter(
    (key) => !key.endsWith("Name") // Don't count locationName as separate change
  ).length;

  const previewText = `Your ${sessionType} has been updated${changeCount > 0 ? ` - ${changeCount} change${changeCount > 1 ? "s" : ""}` : ""}`;

  const formatTime = (isoString: string): string => {
    try {
      // Strip timezone indicators to treat as local time (matches app behavior)
      const localStr = isoString.replace(/Z$/, "").replace(/[+-]\d{2}:\d{2}$/, "");
      const date = new Date(localStr);
      return date.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  const formatDuration = (minutes: number): string => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours} hour${hours > 1 ? "s" : ""}`;
    }
    return `${minutes} minutes`;
  };

  const otherPartyDescription =
    recipientRole === "student"
      ? `with ${mentorName}`
      : `with ${teamName}`;

  return (
    <EmailLayout previewText={previewText}>
      <Text style={heading}>Session Updated</Text>

      <Text style={paragraph}>Hi {recipientName},</Text>

      <Text style={paragraph}>
        Your <strong>{sessionType}</strong> {otherPartyDescription} has been updated.
        Please review the changes below.
      </Text>

      {/* Changes Box */}
      <Section style={changesBox}>
        <Text style={changesHeading}>What Changed</Text>

        {changes.scheduledStart && (
          <Text style={changeItem}>
            <strong>Time:</strong>{" "}
            <span style={oldValue}>{formatTime(changes.scheduledStart.old)}</span>
            {" → "}
            <span style={newValue}>{formatTime(changes.scheduledStart.new)}</span>
          </Text>
        )}

        {changes.duration && (
          <Text style={changeItem}>
            <strong>Duration:</strong>{" "}
            <span style={oldValue}>{formatDuration(changes.duration.old)}</span>
            {" → "}
            <span style={newValue}>{formatDuration(changes.duration.new)}</span>
          </Text>
        )}

        {changes.locationId && (
          <Text style={changeItem}>
            <strong>Location:</strong>{" "}
            <span style={oldValue}>{changes.locationName?.old || "Not set"}</span>
            {" → "}
            <span style={newValue}>{changes.locationName?.new || "Not set"}</span>
          </Text>
        )}

        {changes.meetingUrl && (
          <Text style={changeItem}>
            <strong>Meeting URL:</strong>{" "}
            <span style={oldValue}>{changes.meetingUrl.old || "Not set"}</span>
            {" → "}
            <span style={newValue}>{changes.meetingUrl.new || "Not set"}</span>
          </Text>
        )}
      </Section>

      {/* Updated Session Details */}
      <Section style={detailsBox}>
        <Text style={detailsHeading}>Updated Session Details</Text>
        <Text style={detailsText}>
          <strong>Date:</strong> {sessionDate}
        </Text>
        <Text style={detailsText}>
          <strong>Time:</strong> {sessionTime}
        </Text>
        {recipientRole === "student" && (
          <Text style={detailsText}>
            <strong>Mentor:</strong> {mentorName}
          </Text>
        )}
        {recipientRole === "mentor" && (
          <Text style={detailsText}>
            <strong>Team:</strong> {teamName}
          </Text>
        )}
      </Section>

      <Section style={buttonContainer}>
        <EmailButton href={sessionUrl}>View Session Details</EmailButton>
      </Section>

      <Hr style={hr} />

      <Text style={footer}>
        If you have any questions about these changes, please reach out to your
        program coordinator.
      </Text>
    </EmailLayout>
  );
}

// Styles
const heading: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#0f172a",
  margin: "0 0 24px",
};

const paragraph: React.CSSProperties = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#334155",
  margin: "0 0 16px",
};

const changesBox: React.CSSProperties = {
  backgroundColor: "#eff6ff",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
  border: "1px solid #bfdbfe",
};

const changesHeading: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#1e40af",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 12px",
};

const changeItem: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "24px",
  color: "#334155",
  margin: "0 0 8px",
};

const oldValue: React.CSSProperties = {
  textDecoration: "line-through",
  color: "#94a3b8",
};

const newValue: React.CSSProperties = {
  fontWeight: "600",
  color: "#1e40af",
};

const detailsBox: React.CSSProperties = {
  backgroundColor: "#f8fafc",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
  border: "1px solid #e2e8f0",
};

const detailsHeading: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#64748b",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 12px",
};

const detailsText: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#334155",
  margin: "0 0 4px",
};

const buttonContainer: React.CSSProperties = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const hr: React.CSSProperties = {
  borderColor: "#e2e8f0",
  margin: "24px 0",
};

const footer: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#64748b",
  margin: "24px 0 0",
  fontStyle: "italic",
};

export default SessionUpdateNotificationEmail;
