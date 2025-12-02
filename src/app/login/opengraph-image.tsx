import { generateOgImage, ogImageSize } from "@/lib/og-image";

export const runtime = "edge";
export const alt = "Sign In - Mentor Hub";
export const size = ogImageSize;
export const contentType = "image/png";

export default async function Image() {
  return generateOgImage({
    title: "Sign In",
    subtitle: "Access your mentorship dashboard",
  });
}
