import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
  Link,
  Hr,
} from "@react-email/components";
import * as React from "react";

interface EmailLayoutProps {
  previewText: string;
  children: React.ReactNode;
}

/**
 * Shared email layout with consistent branding and footer
 */
export function EmailLayout({ previewText, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logo}>Mentor Hub</Text>
          </Section>

          {/* Content */}
          <Section style={content}>{children}</Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              This email was sent by Mentor Hub. You're receiving this because
              you're participating in the mentorship program.
            </Text>
            <Text style={footerLinks}>
              <Link href={`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`} style={link}>
                Dashboard
              </Link>
              {" | "}
              <Link href={`${process.env.NEXT_PUBLIC_APP_URL}/sessions`} style={link}>
                Sessions
              </Link>
              {" | "}
              <Link href={`${process.env.NEXT_PUBLIC_APP_URL}/tasks`} style={link}>
                Tasks
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main: React.CSSProperties = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  borderRadius: "8px",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
};

const header: React.CSSProperties = {
  padding: "32px 48px 24px",
  borderBottom: "1px solid #e6ebf1",
};

const logo: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#0f172a",
  margin: "0",
};

const content: React.CSSProperties = {
  padding: "32px 48px",
};

const hr: React.CSSProperties = {
  borderColor: "#e6ebf1",
  margin: "0",
};

const footer: React.CSSProperties = {
  padding: "24px 48px",
};

const footerText: React.CSSProperties = {
  color: "#64748b",
  fontSize: "12px",
  lineHeight: "20px",
  margin: "0 0 16px",
};

const footerLinks: React.CSSProperties = {
  color: "#64748b",
  fontSize: "12px",
};

const link: React.CSSProperties = {
  color: "#3b82f6",
  textDecoration: "none",
};
