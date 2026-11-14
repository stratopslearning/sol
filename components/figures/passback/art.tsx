import * as React from "react";

import { Dots, Line, Solid } from "@/components/iso/react/draw";

import { STATIC } from "./geometry";
import { PassbackLive } from "./live";

function Tray({
  floor,
  walls,
  groove,
  screws,
}: {
  floor: (typeof STATIC)["canvasTray"]["floor"];
  walls: (typeof STATIC)["canvasTray"]["walls"];
  groove: string;
  screws: (typeof STATIC)["canvasTray"]["screws"];
}) {
  return (
    <g>
      <Solid paths={floor} tone="lo" crease="faint" />
      {walls.map((wall, index) => (
        <Solid key={index} paths={wall} tone="mid" crease="faint" />
      ))}
      <Line d={groove} tone="lo" />
      <Dots points={screws} size={0.4} tone="mid" />
    </g>
  );
}

const BASE = (
  <g key="base">
    <path className="iso-halo" d={STATIC.halo} />
    {STATIC.feet.map((foot, index) => (
      <React.Fragment key={index}>
        <Solid paths={foot.peg} tone="lo" crease="none" />
        <Solid paths={foot.pad} tone="mid" crease="none" />
      </React.Fragment>
    ))}
    <Solid paths={STATIC.base} tone="mid" crease="faint" />
    <Line d={STATIC.baseGroove} tone="lo" />
    {STATIC.baseScrews.map((screw, index) => (
      <React.Fragment key={index}>
        <Line d={screw.ring} tone="lo" />
        <Dots points={[screw.dot]} size={0.45} />
      </React.Fragment>
    ))}
    <Solid paths={STATIC.label} tone="lo" crease="none" flat />
    {STATIC.labelRules.map((d, index) => (
      <Line key={index} d={d} tone={index === 0 ? "mid" : "lo"} />
    ))}
    <Solid paths={STATIC.ruler} tone="lo" crease="none" flat />
    <Line d={STATIC.rulerTicks.minor} tone="lo" />
    <Line d={STATIC.rulerTicks.major} tone="mid" />
  </g>
);

const RAILS = (
  <g key="rails">
    {STATIC.rails.map((rail, index) => (
      <g key={index}>
        {rail.mounts.map((mount, mountIndex) => (
          <Solid key={mountIndex} paths={mount} tone="lo" crease="none" />
        ))}
        <Solid paths={rail.bar} tone="mid" crease="faint" />
        <Dots points={rail.caps} size={0.4} tone="mid" />
      </g>
    ))}
  </g>
);

const TRAYS = (
  <g key="trays">
    <Tray {...STATIC.canvasTray} />
    <Tray {...STATIC.gradeTray} />
  </g>
);

const PRESS = (
  <g key="press">
    <Solid paths={STATIC.leftPost.body} tone="mid" crease="faint" />
    <Solid paths={STATIC.leftPost.cap} tone="hi" crease="faint" />
    <Dots points={[STATIC.leftPost.screw]} size={0.45} />
    <Solid paths={STATIC.rightPost.body} tone="mid" crease="faint" />
    <Solid paths={STATIC.rightPost.cap} tone="hi" crease="faint" />
    <Dots points={[STATIC.rightPost.screw]} size={0.45} />
    <Solid paths={STATIC.cross} tone="mid" crease="faint" />
    <Line d={STATIC.crossGroove} tone="lo" />
    <Solid paths={STATIC.knob.body} tone="hi" crease="faint" />
    <Line d={STATIC.knob.knurl} tone="mid" />
    <Solid paths={STATIC.knob.crown} tone="hi" crease="none" />
    <Dots points={[STATIC.knob.top]} size={0.5} tone="mid" />
  </g>
);

const DIAL = (
  <g key="dial">
    <Solid paths={STATIC.dial.stand} tone="lo" crease="faint" />
    <Solid paths={STATIC.dial.body} tone="mid" crease="faint" />
    <Solid paths={STATIC.dial.bezel} tone="hi" crease="none" />
    <Solid paths={STATIC.dial.face} tone="lo" crease="none" flat />
    <Line d={STATIC.dial.ticksMinor} tone="lo" />
    <Line d={STATIC.dial.ticksMajor} tone="mid" />
    <Solid paths={STATIC.dial.hub} tone="hi" crease="none" />
  </g>
);

const TICKET = (
  <g key="ticket">
    <Solid paths={STATIC.idleTicket} tone="hi" crease="faint" lit />
  </g>
);

const STAMP = (
  <g key="stamp">
    <Solid paths={STATIC.idleStamp.shaft} tone="mid" crease="none" />
    <Solid paths={STATIC.idleStamp.collar} tone="hi" crease="faint" />
    <Solid paths={STATIC.idleStamp.pad} tone="hi" crease="faint" lit />
  </g>
);

const NEEDLE = (
  <g key="needle">
    <Line d={STATIC.idleNeedle} tone="lit" />
  </g>
);

export function PassbackArt() {
  return (
    <PassbackLive
      label="Canvas course to SOL activity to Canvas gradebook"
      base={BASE}
      rails={RAILS}
      trays={TRAYS}
      press={PRESS}
      dial={DIAL}
      ticket={TICKET}
      stamp={STAMP}
      needle={NEEDLE}
    />
  );
}
