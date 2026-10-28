import { ImageResponse } from "next/og";

import {
  SOL_CREAM_HEX,
  SOL_MARK_PATH,
  SOL_MARK_VIEWBOX,
} from "@/lib/brand/solMark";

/** Browser-tab favicon: black SOL mark on paper cream (no brand green). */
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

const INK = "#0a0a0a";

export default function Icon() {
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
          borderRadius: 14,
        }}
      >
        <svg
          width="44"
          height="45"
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
