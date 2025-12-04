import { Section, Text, Hr } from "@react-email/components";
import * as React from "react";
import { EmailLayout, EmailButton } from "./components";

interface FeedbackReminderProps {
  recipientName: string;
  role: "student" | "mentor";
  sessionType: string;
  otherPartyName: string; // Mentor name for students, team name for mentors
  sessionDate: string;
  sessionUrl: string;
}

/**
 * Post-session feedback reminder email
 * Sent 24 hours after completed sessions
 */
export function FeedbackReminderEmail({
  recipientName,
  role,
  sessionType,
  otherPartyName,
  sessionDate,
  sessionUrl,
}: FeedbackReminderProps) {
  const roleText = role === "student" ? "mentor" : "team";
  const previewText = `Share your feedback from your ${sessionType} on ${sessionDate}`;

  return (
    <EmailLayout previewText={previewText}>
      <Text style={heading}>How Was Your Session?</Text>

      <Text style={paragraph}>Hi {recipientName},</Text>

      <Text style={paragraph}>
        We hope your <strong>{sessionType}</strong> on <strong>{sessionDate}</strong> with{" "}
        <strong>{otherPartyName}</strong> was valuable. Your feedback helps
        {role === "student"
          ? " mentors improve and helps us ensure you're getting the support you need."
          : " us improve the program and ensures students are getting the guidance they need."}
      </Text>

      <Section style={feedbackBox}>
        <Text style={feedbackIcon}>
          <span role="img" aria-label="feedback">

          </span>
        </Text>
        <Text style={feedbackText}>
          Take 2 minutes to share your thoughts about the session
        </Text>
      </Section>

      <Section style={buttonContainer}>
        <EmailButton href={sessionUrl}>Submit Feedback</EmailButton>
      </Section>

      <Hr style={hr} />

      <Text style={whyHeading}>Why Your Feedback Matters</Text>

      {role === "student" ? (
        <>
          <Text style={bulletText}>
            - Helps your mentor tailor future sessions to your needs
          </Text>
          <Text style={bulletText}>
            - Lets us know if you need additional support
          </Text>
          <Text style={bulletText}>
            - Improves the mentorship program for everyone
          </Text>
        </>
      ) : (
        <>
          <Text style={bulletText}>
            - Helps staff identify students who may need extra support
          </Text>
          <Text style={bulletText}>
            - Documents your mentorship contributions
          </Text>
          <Text style={bulletText}>
            - Guides program improvements
          </Text>
        </>
      )}

      <Text style={footer}>
        Feedback is confidential and used to improve the mentorship experience.
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
  backgroundColor: "#fef3c7",
  borderRadius: "8px",
  padding: "24px",
  margin: "24px 0",
  textAlign: "center" as const,
  border: "1px solid #fcd34d",
};

const feedbackIcon: React.CSSProperties = {
  fontSize: "32px",
  margin: "0 0 12px",
};

const feedbackText: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: "500",
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

const whyHeading: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#0f172a",
  margin: "0 0 12px",
};

const bulletText: React.CSSProperties = {
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

export default FeedbackReminderEmail;
