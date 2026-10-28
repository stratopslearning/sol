import { ImageResponse } from "next/og";

import {
  SOL_CREAM_HEX,
  SOL_MARK_PATH,
  SOL_MARK_VIEWBOX,
} from "@/lib/brand/solMark";

/** Apple touch icon: black SOL mark on paper cream (matches tab favicon). */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const INK = "#0a0a0a";

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
          background: SOL_CREAM_HEX,
          borderRadius: 40,
        }}
      >
        <svg
          width="128"
          height="132"
          viewBox={SOL_MARK_VIEWBOX}
          fill="none"
        >
          <path fill={INK} fillRule="evenodd" d={SOL_MARK_PATH} />
        </svg>
      </div>
    ),
    { ...size },
  );
}
