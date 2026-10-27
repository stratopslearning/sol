import { ImageResponse } from "next/og";

import { SOL_BRAND_HEX } from "@/lib/brand/solMark";
import { solMarkPngDataUri } from "@/lib/brand/solMarkDataUri";

// Browser-tab favicon: organic SOL sun mark on brand green.
// PNG via next/og (SVG favicons are inconsistently supported).
export const size = { width: 48, height: 48 };
export const contentType = "image/png";

export default async function Icon() {
  const mark = await solMarkPngDataUri();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: SOL_BRAND_HEX,
          borderRadius: 11,
        }}
      >
        <img
          src={mark}
          width={34}
          height={35}
          alt=""
          style={{ objectFit: "contain" }}
        />
      </div>
    ),
    { ...size },
  );
}
