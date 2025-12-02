import { generateOgImage, ogImageSize } from "@/lib/og-image";

export const runtime = "edge";
export const alt = "Sign Up - Mentor Hub";
export const size = ogImageSize;
export const contentType = "image/png";

export default async function Image() {
  return generateOgImage({
    title: "Join Mentor Hub",
    subtitle: "Create your account and get started",
  });
}
