import { generateOgImage, ogImageSize } from "@/lib/og-image";

export const runtime = "edge";
export const alt = "Teams - Mentor Hub";
export const size = ogImageSize;
export const contentType = "image/png";

export default async function Image() {
  return generateOgImage({
    title: "Teams",
    subtitle: "View and manage your team members",
  });
}
