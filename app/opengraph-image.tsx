import { ImageResponse } from "next/og";

import { SOL_BRAND_HEX, SOL_CREAM_HEX } from "@/lib/brand/solMark";
import { solMarkPngDataUri } from "@/lib/brand/solMarkDataUri";

export const alt = "SOL. Teaching, in a better light.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const mark = await solMarkPngDataUri();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          background: SOL_BRAND_HEX,
          padding: "72px 80px",
        }}
      >
        <img
          src={mark}
          width={168}
          height={173}
          alt=""
          style={{ objectFit: "contain" }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              color: SOL_CREAM_HEX,
              fontSize: 58,
              fontWeight: 500,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            <span>Teaching,</span>
            <span style={{ opacity: 0.88 }}>in a better light.</span>
          </div>
          <div
            style={{
              display: "flex",
              color: "rgba(251, 251, 247, 0.72)",
              fontSize: 24,
              fontWeight: 400,
              letterSpacing: "0.01em",
              maxWidth: 720,
            }}
          >
            The AI teaching layer for the LMS you already use.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
