import { Section, Text, Hr } from "@react-email/components";
import * as React from "react";
import { EmailLayout, EmailButton } from "./components";

interface MeetingPrepReminderProps {
  recipientName: string;
  sessionType: string;
  mentorName: string;
  sessionDate: string;
  sessionTime: string;
  hoursUntilSession: number;
  sessionUrl: string;
  teamName?: string;
}

/**
 * Meeting prep reminder email for students
 * Sent 48h and 24h before upcoming sessions
 * Key difference from old pre-meeting reminder: emphasizes Zoom link is locked until prep is submitted
 */
export function MeetingPrepReminderEmail({
  recipientName,
  sessionType,
  mentorName,
  sessionDate,
  sessionTime,
  hoursUntilSession,
  sessionUrl,
}: MeetingPrepReminderProps) {
  const urgencyText =
    hoursUntilSession <= 24
      ? "tomorrow"
      : `in ${Math.round(hoursUntilSession / 24)} days`;

  const previewText = `Submit meeting prep to unlock your Zoom link - session ${urgencyText}`;

  return (
    <EmailLayout previewText={previewText}>
      <Text style={heading}>Prepare for Your Session</Text>

      <Text style={paragraph}>Hi {recipientName},</Text>

      <Text style={paragraph}>
        Your <strong>{sessionType}</strong> with <strong>{mentorName}</strong> is
        coming up {urgencyText}. Submit your meeting prep to unlock access to the
        Zoom link.
      </Text>

      {/* Alert Box - Zoom Link Locked Notice */}
      <Section style={alertBox}>
        <Text style={alertHeading}>Meeting Link Locked</Text>
        <Text style={alertText}>
          Your Zoom link is hidden until you submit your meeting prep. This helps
          ensure productive sessions by making sure both you and your mentor are
          prepared.
        </Text>
      </Section>

      {/* Session Details */}
      <Section style={detailsBox}>
        <Text style={detailsHeading}>Session Details</Text>
        <Text style={detailsText}>
          <strong>Date:</strong> {sessionDate}
        </Text>
        <Text style={detailsText}>
          <strong>Time:</strong> {sessionTime}
        </Text>
        <Text style={detailsText}>
          <strong>Mentor:</strong> {mentorName}
        </Text>
      </Section>

      <Section style={buttonContainer}>
        <EmailButton href={sessionUrl}>Submit Meeting Prep</EmailButton>
      </Section>

      <Hr style={hr} />

      <Text style={tipHeading}>What to Include in Your Prep</Text>
      <Text style={tipText}>- Topics or questions you want to discuss</Text>
      <Text style={tipText}>- Updates on action items from previous sessions</Text>
      <Text style={tipText}>- Any challenges or wins you want to share</Text>
      <Text style={tipText}>- Materials or links relevant to your conversation</Text>

      <Text style={footer}>
        Once you submit your prep, you'll immediately gain access to the meeting
        link. Your mentor will also be able to review your prep before the session.
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

const alertBox: React.CSSProperties = {
  backgroundColor: "#fef3c7",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
  border: "1px solid #fcd34d",
};

const alertHeading: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#92400e",
  margin: "0 0 8px",
};

const alertText: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#92400e",
  margin: "0",
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

const tipHeading: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#0f172a",
  margin: "0 0 12px",
};

const tipText: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#64748b",
  margin: "0 0 8px",
  paddingLeft: "8px",
};

const footer: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#64748b",
  margin: "24px 0 0",
  fontStyle: "italic",
};

export default MeetingPrepReminderEmail;
