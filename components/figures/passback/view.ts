import {
  fitProjection,
  iso,
  type Flat,
  type Plan,
  type Point3,
  type Projection,
} from "@/components/iso/iso-kit";

export const WIDTH = 640;
export const HEIGHT = 380;
export const AZIMUTH = 38;

export const BASE: Plan = { x: -150, y: -72, w: 300, d: 144, r: 8 };
export const BASE_H = 10;
export const FOOT_H = 5;

/** Ticket travels along x from Canvas tray → stamp → gradebook tray */
export const TICKET_Y = 4;
export const TICKET_W = 36;
export const TICKET_D = 26;
export const TICKET_H = 2.2;
export const TICKET_Z = 14;

export const RAIL_Y = [-8, 28] as const;
export const RAIL_Z = 11;
export const RAIL_H = 2.4;
export const RAIL_FROM = -118;
export const RAIL_TO = 118;

export const CANVAS_TRAY: Plan = { x: -132, y: -18, w: 52, d: 56, r: 3 };
export const GRADE_TRAY: Plan = { x: 80, y: -18, w: 52, d: 56, r: 3 };
export const TRAY_WALL = 3.2;
export const TRAY_H = 16;

export const PRESS_X = 0;
export const POST_HALF = 22;
export const POST_Y = -6;
export const POST_W = 8;
export const POST_D = 8;
export const POST_TOP = 78;
export const CROSS_Z = 68;
export const CROSS_H = 8;

export const STAMP_HOME_Z = 42;
export const STAMP_DOWN_Z = 18;
export const STAMP_R = 10;
export const STAMP_H = 8;

export const DIAL: Flat = [0, 48];
export const DIAL_R = 14;
export const DIAL_Z = 18;
export const DIAL_H = 7;
export const DIAL_SPAN = 18;

export const X_CANVAS = -108;
export const X_STAMP = -18;
export const X_GRADE = 90;

const corners = (plan: Plan, z0: number, z1: number): Point3[] => {
  const out: Point3[] = [];
  for (const px of [plan.x, plan.x + plan.w]) {
    for (const py of [plan.y, plan.y + plan.d]) {
      for (const z of [z0, z1]) out.push([px, py, z]);
    }
  }
  return out;
};

export const P: Projection = fitProjection(
  [
    ...corners(BASE, -BASE_H - FOOT_H, 0),
    [PRESS_X, POST_Y, POST_TOP + 12],
    [DIAL[0] + DIAL_R, DIAL[1], DIAL_Z + DIAL_H + 4],
    [GRADE_TRAY.x + GRADE_TRAY.w, GRADE_TRAY.y + GRADE_TRAY.d, TRAY_H],
  ],
  WIDTH,
  HEIGHT,
  { pad: 28, azimuth: AZIMUTH },
);

export const at = (point: Point3): Flat => iso(point, P);
