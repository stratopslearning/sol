"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Plate } from "@/components/iso/react/draw";

import { PassbackArt } from "./art";
import { readoutOf } from "./model";

import "@/components/iso/iso.css";
import "./passback.css";

export function PassbackFigure() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const light = !mounted || resolvedTheme !== "dark";

  return (
    <div className="iso passback-figure" data-theme={light ? "light" : "dark"}>
      <Plate
        fig="Fig 1"
        title="How it fits Canvas"
        hint="Drag · ← → · Space"
        readout={readoutOf(0)}
        keys={[
          { mark: "lit", label: "The grade ticket in motion" },
          { mark: "raised", label: "SOL stamp press" },
          { mark: "edge", label: "Path from Canvas to gradebook" },
        ]}
        caption="A grade ticket leaves the Canvas course tray, stops under SOL’s stamp for rubric scoring, then lands in the Canvas gradebook tray. Drag or use the arrow keys to walk the path."
      >
        <PassbackArt />
      </Plate>
    </div>
  );
}
