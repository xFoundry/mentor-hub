"use client";

import Image from "next/image";
import { useTheme } from "next-themes";

interface LogoProps {
  size?: number;
  className?: string;
}

/**
 * Logo Component
 *
 * Displays the xFoundry X logo with automatic theme switching:
 * - Light mode: White logo (x-icon-white.png)
 * - Dark mode: Blue logo (x-icon-blue.png)
 */
export function Logo({ size = 32, className }: LogoProps) {
  const { resolvedTheme } = useTheme();
  const logoSrc = resolvedTheme === "dark"
    ? "/x-icon-blue.png"
    : "/x-icon-white.png";

  // For SSR, show a placeholder with the same dimensions
  if (!resolvedTheme) {
    return (
      <div
        className={className}
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
    );
  }

  return (
    <Image
      src={logoSrc}
      alt="xFoundry Logo"
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}

/**
 * Logo with text for branding
 */
export function LogoWithText({
  size = 32,
  className,
  textClassName,
}: LogoProps & { textClassName?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className || ""}`}>
      <Logo size={size} />
      <span className={textClassName}>Mentor Hub</span>
    </div>
  );
}
