import { Section, Text, Hr } from "@react-email/components";
import * as React from "react";
import { EmailLayout, EmailButton } from "./components";

interface ImmediateFeedbackReminderProps {
  recipientName: string;
  role: "student" | "mentor";
  sessionType: string;
  otherPartyName: string; // Mentor name for students, team name for mentors
  sessionDate: string;
  sessionTime: string;
  sessionUrl: string;
}

/**
 * Immediate feedback reminder email
 * Sent right when the session ends (start time + duration)
 * Different from 24h follow-up: encourages capturing feedback "while it's fresh"
 */
export function ImmediateFeedbackReminderEmail({
  recipientName,
  role,
  sessionType,
  otherPartyName,
  sessionDate,
  sessionTime,
  sessionUrl,
}: ImmediateFeedbackReminderProps) {
  const previewText =
    role === "student"
      ? `How was your session with ${otherPartyName}? Share your thoughts`
      : `Quick feedback on your session with ${otherPartyName}`;

  return (
    <EmailLayout previewText={previewText}>
      <Text style={heading}>
        {role === "student" ? "How Was Your Session?" : "Quick Session Feedback"}
      </Text>

      <Text style={paragraph}>Hi {recipientName},</Text>

      <Text style={paragraph}>
        Your <strong>{sessionType}</strong> with <strong>{otherPartyName}</strong>{" "}
        just ended. While it's fresh in your mind, take a moment to share your
        thoughts.
      </Text>

      {/* Role-specific messaging */}
      <Section style={feedbackBox}>
        <Text style={feedbackText}>
          {role === "student"
            ? `Your feedback helps ${otherPartyName} understand what's working and how to better support you in future sessions.`
            : `Capture any notes, observations, or follow-up items while they're fresh. Your insights help track team progress and identify where additional support might be needed.`}
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
          <strong>{role === "student" ? "Mentor" : "Team"}:</strong> {otherPartyName}
        </Text>
      </Section>

      <Section style={buttonContainer}>
        <EmailButton href={sessionUrl}>Submit Feedback</EmailButton>
      </Section>

      <Hr style={hr} />

      <Text style={tipHeading}>
        {role === "student" ? "Your feedback helps:" : "Things to capture:"}
      </Text>

      {role === "student" ? (
        <>
          <Text style={tipText}>- Your mentor improve future sessions</Text>
          <Text style={tipText}>
            - Staff identify if you need additional support
          </Text>
          <Text style={tipText}>- Improve the mentorship program overall</Text>
        </>
      ) : (
        <>
          <Text style={tipText}>- Team engagement and progress level</Text>
          <Text style={tipText}>- Any concerns or blockers discussed</Text>
          <Text style={tipText}>- Action items and follow-up needs</Text>
        </>
      )}

      <Text style={footer}>
        Feedback takes about 2 minutes and is confidential.
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

const feedbackBox: React.CSSProperties = {
  backgroundColor: "#eff6ff",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
  border: "1px solid #bfdbfe",
};

const feedbackText: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#1e40af",
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

export default ImmediateFeedbackReminderEmail;
