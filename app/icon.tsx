import { ImageResponse } from "next/og";

// Browser-tab favicon — a radiating sun ("sol" = sun) in cream on a forest-green
// tile. Generated as a PNG (via next/og) rather than an SVG: SVG favicons have
// inconsistent browser support, whereas PNG renders reliably everywhere.
export const size = { width: 48, height: 48 };
export const contentType = "image/png";

// Brand forest green (--brand ≈ oklch(0.42 0.075 162)) on paper cream (--paper).
const BRAND = "#2f5f4f";
const CREAM = "#fbfbf7";

export default function Icon() {
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
          borderRadius: 11,
        }}
      >
        <div
          style={{
            position: "relative",
            width: 44,
            height: 44,
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
                width: 3.4,
                height: 7,
                borderRadius: 2,
                background: CREAM,
                transform: `rotate(${deg}deg) translateY(-15.5px)`,
              }}
            />
          ))}
          <div
            style={{
              width: 14,
              height: 14,
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
