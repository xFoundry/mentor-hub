import { Button } from "@react-email/components";
import * as React from "react";

interface EmailButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}

/**
 * Styled button for email CTAs
 */
export function EmailButton({
  href,
  children,
  variant = "primary",
}: EmailButtonProps) {
  const style = variant === "primary" ? primaryStyle : secondaryStyle;

  return (
    <Button href={href} style={style}>
      {children}
    </Button>
  );
}

const primaryStyle: React.CSSProperties = {
  backgroundColor: "#0f172a",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};

const secondaryStyle: React.CSSProperties = {
  backgroundColor: "#f1f5f9",
  borderRadius: "6px",
  color: "#0f172a",
  fontSize: "14px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};
