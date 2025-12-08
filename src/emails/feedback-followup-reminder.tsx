import { Section, Text, Hr } from "@react-email/components";
import * as React from "react";
import { EmailLayout, EmailButton } from "./components";

interface FeedbackFollowupReminderProps {
  recipientName: string;
  role: "student" | "mentor";
  sessionType: string;
  otherPartyName: string; // Mentor name for students, team name for mentors
  sessionDate: string;
  sessionUrl: string;
}

/**
 * 24-hour feedback follow-up reminder email
 * Sent 24h after session ends ONLY if feedback hasn't been submitted
 * More urgent tone than the immediate reminder
 */
export function FeedbackFollowupReminderEmail({
  recipientName,
  role,
  sessionType,
  otherPartyName,
  sessionDate,
  sessionUrl,
}: FeedbackFollowupReminderProps) {
  const previewText = `Reminder: Share your feedback from your ${sessionType} with ${otherPartyName}`;

  return (
    <EmailLayout previewText={previewText}>
      <Text style={heading}>Quick Reminder: Share Your Feedback</Text>

      <Text style={paragraph}>Hi {recipientName},</Text>

      <Text style={paragraph}>
        We noticed you haven't submitted feedback for your{" "}
        <strong>{sessionType}</strong> with <strong>{otherPartyName}</strong> on{" "}
        <strong>{sessionDate}</strong>. It only takes a couple of minutes!
      </Text>

      {/* Reminder Box */}
      <Section style={reminderBox}>
        <Text style={reminderText}>
          {role === "student"
            ? "Your feedback is valuable - it helps your mentor understand how to best support you and improves the program for everyone."
            : "Your observations help staff track team progress and identify where additional support might be needed."}
        </Text>
      </Section>

      <Section style={buttonContainer}>
        <EmailButton href={sessionUrl}>Submit Feedback Now</EmailButton>
      </Section>

      <Hr style={hr} />

      <Text style={tipHeading}>Why does feedback matter?</Text>

      {role === "student" ? (
        <>
          <Text style={tipText}>
            - Helps {otherPartyName} tailor future sessions to your needs
          </Text>
          <Text style={tipText}>
            - Lets program staff know if you need additional support
          </Text>
          <Text style={tipText}>
            - Contributes to improving the mentorship experience
          </Text>
        </>
      ) : (
        <>
          <Text style={tipText}>
            - Helps staff identify students who may need extra support
          </Text>
          <Text style={tipText}>- Documents your mentorship contributions</Text>
          <Text style={tipText}>- Guides program improvements</Text>
        </>
      )}

      <Text style={footer}>
        Feedback is confidential and used solely to improve the mentorship
        experience.
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

const reminderBox: React.CSSProperties = {
  backgroundColor: "#fef3c7",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
  border: "1px solid #fcd34d",
};

const reminderText: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#92400e",
  margin: "0",
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

export default FeedbackFollowupReminderEmail;
