import { ImageResponse } from "next/og";

// Apple touch icon (iOS home screen / Safari) — same sun-ray mark as app/icon.svg,
// rendered as a 180x180 PNG since Apple prefers raster touch icons.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Brand forest green (--brand ≈ oklch(0.42 0.075 162)) on paper cream (--paper).
const BRAND = "#2f5f4f";
const CREAM = "#fbfbf7";

export default function AppleIcon() {
  const rays = Array.from({ length: 8 }, (_, i) => i * 45);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND,
          borderRadius: 40,
        }}
      >
        <div
          style={{
            position: "relative",
            width: 160,
            height: 160,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {rays.map((deg) => (
            <div
              key={deg}
              style={{
                position: "absolute",
                width: 12,
                height: 26,
                borderRadius: 6,
                background: CREAM,
                transform: `rotate(${deg}deg) translateY(-58px)`,
              }}
            />
          ))}
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: CREAM,
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
