import { ImageResponse } from "next/og";

import { SOL_BRAND_HEX } from "@/lib/brand/solMark";
import { solMarkPngDataUri } from "@/lib/brand/solMarkDataUri";

// Apple touch icon: same mark as the tab favicon, 180×180 raster.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
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
          borderRadius: 40,
        }}
      >
        <img
          src={mark}
          width={128}
          height={132}
          alt=""
          style={{ objectFit: "contain" }}
        />
      </div>
    ),
    { ...size },
  );
}
