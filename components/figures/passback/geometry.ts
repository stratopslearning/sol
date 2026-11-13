import {
  corners,
  cylinder,
  depthOf,
  insetPlan,
  knurl,
  pathOf,
  planOutline,
  radialTicks,
  ring,
  segment,
  slabOf,
  topTicks,
  type Plan,
  type Plane,
  type Point3,
  type SolidPaths,
} from "@/components/iso/iso-kit";

import {
  BASE,
  BASE_H,
  CANVAS_TRAY,
  CROSS_H,
  CROSS_Z,
  DIAL,
  DIAL_H,
  DIAL_R,
  DIAL_SPAN,
  DIAL_Z,
  FOOT_H,
  GRADE_TRAY,
  P,
  POST_D,
  POST_HALF,
  POST_TOP,
  POST_W,
  POST_Y,
  PRESS_X,
  RAIL_FROM,
  RAIL_H,
  RAIL_TO,
  RAIL_Y,
  RAIL_Z,
  STAMP_H,
  STAMP_HOME_Z,
  STAMP_R,
  TICKET_D,
  TICKET_H,
  TICKET_W,
  TICKET_Y,
  TICKET_Z,
  TRAY_H,
  TRAY_WALL,
  at,
} from "./view";

const solid = (plan: Plan, z: number, h: number, steps = 6, bevel = 0) =>
  slabOf(plan, z, h, P, steps, bevel);

const byDepth = (points: Plane[]) =>
  [...points].sort(
    (a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P),
  );

function trayArt(tray: Plan) {
  const floor = insetPlan(tray, 2);
  const walls: { plan: Plan; h: number }[] = [
    {
      plan: { x: tray.x, y: tray.y, w: tray.w, d: TRAY_WALL, r: 1 },
      h: TRAY_H,
    },
    {
      plan: {
        x: tray.x,
        y: tray.y + tray.d - TRAY_WALL,
        w: tray.w,
        d: TRAY_WALL,
        r: 1,
      },
      h: TRAY_H,
    },
    {
      plan: {
        x: tray.x,
        y: tray.y + TRAY_WALL,
        w: TRAY_WALL,
        d: tray.d - TRAY_WALL * 2,
        r: 1,
      },
      h: TRAY_H,
    },
    {
      plan: {
        x: tray.x + tray.w - TRAY_WALL,
        y: tray.y + TRAY_WALL,
        w: TRAY_WALL,
        d: tray.d - TRAY_WALL * 2,
        r: 1,
      },
      h: TRAY_H,
    },
  ];
  return {
    floor: solid(floor, 0, 1.6, 4, 0.4),
    walls: walls.map((w) => solid(w.plan, 0, w.h, 4, 0.4)),
    groove: planOutline(insetPlan(floor, 2), 1.6, P),
    screws: corners(tray, 5).map(([x, y]) => at([x, y, 1.6])),
  };
}

function post(x: number): { body: SolidPaths; cap: SolidPaths; screw: ReturnType<typeof at> } {
  const plan: Plan = {
    x: x - POST_W / 2,
    y: POST_Y,
    w: POST_W,
    d: POST_D,
    r: 1.2,
  };
  return {
    body: solid(plan, 0, POST_TOP, 5, 0.6),
    cap: solid(insetPlan(plan, 1), POST_TOP, 2.4, 4, 0.3),
    screw: at([x, POST_Y + POST_D / 2, POST_TOP + 2.4]),
  };
}

const FEET = corners(BASE, 16);
const BASE_SCREWS = corners(BASE, 9);
const LABEL: Plan = {
  x: BASE.x + 18,
  y: BASE.y + BASE.d - 18,
  w: 58,
  d: 10,
  r: 1.5,
};
const RULER: Plan = {
  x: BASE.x + 14,
  y: BASE.y + 8,
  w: BASE.w - 28,
  d: 7,
  r: 1,
};

const leftPost = post(PRESS_X - POST_HALF);
const rightPost = post(PRESS_X + POST_HALF);

const CROSS: Plan = {
  x: PRESS_X - POST_HALF - 4,
  y: POST_Y - 1,
  w: POST_HALF * 2 + 8,
  d: POST_D + 2,
  r: 1.5,
};

const KNOB_R = 7;
const KNOB_Z = CROSS_Z + CROSS_H;
const KNOB_H = 10;

const DIAL_FACE_Z = DIAL_Z + DIAL_H;
const dialTicks = radialTicks(
  DIAL[0],
  DIAL[1],
  DIAL_R - 2.4,
  12,
  3,
  DIAL_FACE_Z,
  [1.6, 3.2],
  P,
);

function needlePath(angleFrac: number) {
  const start = (-90 - DIAL_SPAN / 2) * (Math.PI / 180);
  const span = DIAL_SPAN * (Math.PI / 180);
  const angle = start + span * angleFrac;
  const tipR = DIAL_R - 4;
  const hub: Point3 = [DIAL[0], DIAL[1], DIAL_FACE_Z + 0.4];
  const tip: Point3 = [
    DIAL[0] + Math.cos(angle) * tipR,
    DIAL[1] + Math.sin(angle) * tipR,
    DIAL_FACE_Z + 0.4,
  ];
  return segment(hub, tip, P);
}

export function ticketPlan(x: number): Plan {
  return {
    x,
    y: TICKET_Y,
    w: TICKET_W,
    d: TICKET_D,
    r: 1.5,
  };
}

export function ticketPaths(x: number): SolidPaths {
  return solid(ticketPlan(x), TICKET_Z, TICKET_H, 4, 0.35);
}

export function stampPaths(z: number): {
  shaft: SolidPaths;
  pad: SolidPaths;
  collar: SolidPaths;
} {
  const shaft = cylinder(PRESS_X, POST_Y + POST_D / 2, 3.2, z + STAMP_H, STAMP_HOME_Z + 18 - (z + STAMP_H), P, 20);
  const pad = cylinder(PRESS_X, POST_Y + POST_D / 2, STAMP_R, z, STAMP_H, P, 28, 0.4);
  const collar = cylinder(PRESS_X, POST_Y + POST_D / 2, 5.2, z + STAMP_H, 3, P, 20);
  return { shaft, pad, collar };
}

export const STATIC = {
  halo: solid(BASE, -BASE_H - FOOT_H, BASE_H).fill,
  feet: byDepth(FEET).map(([x, y]) => ({
    peg: cylinder(x, y, 6.5, -BASE_H - FOOT_H, 1.8, P, 24),
    pad: cylinder(x, y, 5.2, -BASE_H - FOOT_H + 1.8, FOOT_H - 1.8, P, 24),
  })),
  base: solid(BASE, -BASE_H, BASE_H, 8, 1.4),
  baseGroove: planOutline(insetPlan(BASE, 5), 0, P),
  baseScrews: BASE_SCREWS.map(([x, y]) => ({
    ring: ring(x, y, 2.1, 0, P, 14),
    dot: at([x, y, 0]),
  })),
  label: solid(LABEL, 0, 0.8, 3),
  labelRules: [
    planOutline(insetPlan(LABEL, 1.6), 0.8, P),
    pathOf([
      at([LABEL.x + 4, LABEL.y + 3.2, 0.8]),
      at([LABEL.x + LABEL.w - 4, LABEL.y + 3.2, 0.8]),
    ]),
    pathOf([
      at([LABEL.x + 4, LABEL.y + 5.6, 0.8]),
      at([LABEL.x + LABEL.w - 10, LABEL.y + 5.6, 0.8]),
    ]),
    pathOf([
      at([LABEL.x + 4, LABEL.y + 7.6, 0.8]),
      at([LABEL.x + LABEL.w - 16, LABEL.y + 7.6, 0.8]),
    ]),
  ],
  ruler: solid(RULER, 0, 0.7, 3),
  rulerTicks: topTicks(
    RULER.x + 4,
    RULER.x + RULER.w - 4,
    4,
    5,
    RULER.y + 0.8,
    0.7,
    [2, 3.4],
    P,
  ),
  rails: RAIL_Y.map((y) => ({
    bar: solid(
      { x: RAIL_FROM, y, w: RAIL_TO - RAIL_FROM, d: 4.5, r: 1 },
      RAIL_Z,
      RAIL_H,
      4,
      0.35,
    ),
    mounts: [RAIL_FROM + 8, RAIL_TO - 8].map((x) =>
      cylinder(x, y + 2.2, 2.4, 0, RAIL_Z, P, 16),
    ),
    caps: [RAIL_FROM + 8, RAIL_TO - 8].map((x) =>
      at([x, y + 2.2, RAIL_Z + RAIL_H]),
    ),
  })),
  canvasTray: trayArt(CANVAS_TRAY),
  gradeTray: trayArt(GRADE_TRAY),
  leftPost,
  rightPost,
  cross: solid(CROSS, CROSS_Z, CROSS_H, 5, 0.5),
  crossGroove: planOutline(insetPlan(CROSS, 2), CROSS_Z + CROSS_H, P),
  knob: {
    body: cylinder(PRESS_X, POST_Y + POST_D / 2, KNOB_R, KNOB_Z, KNOB_H, P, 28, 0.4),
    crown: cylinder(
      PRESS_X,
      POST_Y + POST_D / 2,
      KNOB_R - 1.4,
      KNOB_Z + KNOB_H,
      2.2,
      P,
      24,
    ),
    knurl: knurl(
      PRESS_X,
      POST_Y + POST_D / 2,
      KNOB_R,
      KNOB_Z + 1,
      KNOB_Z + KNOB_H - 1,
      18,
      P,
    ),
    top: at([PRESS_X, POST_Y + POST_D / 2, KNOB_Z + KNOB_H + 2.2]),
  },
  dial: {
    body: cylinder(DIAL[0], DIAL[1], DIAL_R, DIAL_Z, DIAL_H, P, 36, 0.4),
    bezel: cylinder(DIAL[0], DIAL[1], DIAL_R + 1.4, DIAL_FACE_Z, 1.4, P, 36),
    face: cylinder(DIAL[0], DIAL[1], DIAL_R - 1.2, DIAL_FACE_Z, 0.4, P, 36),
    hub: cylinder(DIAL[0], DIAL[1], 2.2, DIAL_FACE_Z, 1.2, P, 16),
    ticksMinor: dialTicks.minor,
    ticksMajor: dialTicks.major,
    stand: solid(
      {
        x: DIAL[0] - 6,
        y: DIAL[1] - 6,
        w: 12,
        d: 12,
        r: 2,
      },
      0,
      DIAL_Z,
      4,
      0.4,
    ),
  },
  idleTicket: ticketPaths(-108),
  idleStamp: stampPaths(STAMP_HOME_Z),
  idleNeedle: needlePath(0),
};

export { needlePath };
