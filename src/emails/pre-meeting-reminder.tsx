import { Section, Text, Hr } from "@react-email/components";
import * as React from "react";
import { EmailLayout, EmailButton } from "./components";

interface PreMeetingReminderProps {
  recipientName: string;
  sessionType: string;
  mentorName: string;
  sessionDate: string;
  sessionTime: string;
  hoursUntilSession: number;
  sessionUrl: string;
}

/**
 * Pre-meeting reminder email for students
 * Sent 48h and 24h before upcoming sessions
 */
export function PreMeetingReminderEmail({
  recipientName,
  sessionType,
  mentorName,
  sessionDate,
  sessionTime,
  hoursUntilSession,
  sessionUrl,
}: PreMeetingReminderProps) {
  const urgencyText =
    hoursUntilSession <= 24
      ? "tomorrow"
      : `in ${Math.round(hoursUntilSession / 24)} days`;

  const previewText = `Prepare for your ${sessionType} with ${mentorName} ${urgencyText}`;

  return (
    <EmailLayout previewText={previewText}>
      <Text style={heading}>Prepare for Your Session</Text>

      <Text style={paragraph}>Hi {recipientName},</Text>

      <Text style={paragraph}>
        Your <strong>{sessionType}</strong> with <strong>{mentorName}</strong> is
        coming up {urgencyText}. Take a few minutes to prepare so you can make
        the most of your time together.
      </Text>

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
        <EmailButton href={sessionUrl}>Prepare Now</EmailButton>
      </Section>

      <Hr style={hr} />

      <Text style={tipHeading}>Preparation Tips</Text>
      <Text style={tipText}>
        - Review any tasks or action items from your last session
      </Text>
      <Text style={tipText}>
        - Think about questions you want to ask your mentor
      </Text>
      <Text style={tipText}>
        - Note any challenges or successes you want to discuss
      </Text>

      <Text style={footer}>
        Being prepared helps you and your mentor have more productive
        conversations and ensures you get the guidance you need.
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

export default PreMeetingReminderEmail;
