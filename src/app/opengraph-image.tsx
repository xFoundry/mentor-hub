import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Mentor Hub - Mentorship Portal";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0f172a",
          backgroundImage:
            "radial-gradient(circle at 25% 25%, #1e3a5f 0%, transparent 50%), radial-gradient(circle at 75% 75%, #1e3a5f 0%, transparent 50%)",
        }}
      >
        {/* Logo and Title */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              backgroundColor: "#3b82f6",
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 24,
              fontSize: 48,
              fontWeight: "bold",
              color: "white",
            }}
          >
            X
          </div>
          <div
            style={{
              fontSize: 64,
              fontWeight: "bold",
              color: "white",
            }}
          >
            Mentor Hub
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            color: "#94a3b8",
            textAlign: "center",
            maxWidth: 800,
          }}
        >
          Connect with mentors, track sessions, and manage action items
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            display: "flex",
            alignItems: "center",
            fontSize: 24,
            color: "#64748b",
          }}
        >
          xFoundry Mentorship Portal
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
