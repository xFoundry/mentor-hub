import { ImageResponse } from "next/og";

export const ogImageSize = {
  width: 1200,
  height: 630,
};

interface OgImageProps {
  title: string;
  subtitle?: string;
  icon?: string;
}

export function generateOgImage({ title, subtitle, icon }: OgImageProps) {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0f172a",
          backgroundImage:
            "radial-gradient(circle at 25% 25%, #1e3a5f 0%, transparent 50%), radial-gradient(circle at 75% 75%, #1e3a5f 0%, transparent 50%)",
          padding: 60,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              backgroundColor: "#3b82f6",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 16,
              fontSize: 32,
              fontWeight: "bold",
              color: "white",
            }}
          >
            X
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: "#94a3b8",
            }}
          >
            Mentor Hub
          </div>
        </div>

        {/* Main Content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          {icon && (
            <div
              style={{
                fontSize: 64,
                marginBottom: 24,
              }}
            >
              {icon}
            </div>
          )}
          <div
            style={{
              fontSize: 72,
              fontWeight: "bold",
              color: "white",
              lineHeight: 1.1,
              marginBottom: 16,
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{
                fontSize: 32,
                color: "#94a3b8",
                lineHeight: 1.4,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #334155",
            paddingTop: 24,
          }}
        >
          <div
            style={{
              fontSize: 20,
              color: "#64748b",
            }}
          >
            xFoundry Mentorship Portal
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: "#3b82f6",
              }}
            />
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: "#10b981",
              }}
            />
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: "#f59e0b",
              }}
            />
          </div>
        </div>
      </div>
    ),
    {
      ...ogImageSize,
    }
  );
}
