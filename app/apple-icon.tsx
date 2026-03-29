import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f0e0d",
          borderRadius: "40px",
        }}
      >
        <span
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 102,
            color: "#e8e4de",
            fontWeight: 600,
            lineHeight: 1,
            letterSpacing: "-4px",
          }}
        >
          v
        </span>
      </div>
    ),
    { ...size }
  );
}
