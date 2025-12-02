import { generateOgImage, ogImageSize } from "@/lib/og-image";

export const runtime = "edge";
export const alt = "Dashboard - Mentor Hub";
export const size = ogImageSize;
export const contentType = "image/png";

export default async function Image() {
  return generateOgImage({
    title: "Dashboard",
    subtitle: "Your mentorship overview at a glance",
  });
}
