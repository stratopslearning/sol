/** Pure model for the Canvas → SOL → gradebook passback desk. */

export type Station = "canvas" | "stamp" | "gradebook";

export const STATIONS: Station[] = ["canvas", "stamp", "gradebook"];

export const STATION_LABEL: Record<Station, string> = {
  canvas: "Canvas course",
  stamp: "SOL activity",
  gradebook: "Canvas gradebook",
};

export const STATION_X = {
  canvas: -108,
  stamp: -18,
  gradebook: 90,
} as const;

/** Progress 0→1 along the three stations (piecewise). */
export function xOf(progress: number): number {
  const t = clamp(progress, 0, 1);
  if (t < 1 / 3) {
    const u = t * 3;
    return lerp(STATION_X.canvas, STATION_X.stamp, ease(u));
  }
  if (t < 2 / 3) {
    return STATION_X.stamp;
  }
  const u = (t - 2 / 3) * 3;
  return lerp(STATION_X.stamp, STATION_X.gradebook, ease(u));
}

/** Stamp press depth 0 at rest, 1 fully down. */
export function stampOf(progress: number): number {
  const t = clamp(progress, 0, 1);
  if (t < 0.28) return 0;
  if (t < 0.38) return ease((t - 0.28) / 0.1);
  if (t < 0.52) return 1;
  if (t < 0.62) return 1 - ease((t - 0.52) / 0.1);
  return 0;
}

/** Dial needle 0→1 while scoring. */
export function needleOf(progress: number): number {
  const t = clamp(progress, 0, 1);
  if (t < 0.3) return 0;
  if (t < 0.55) return ease((t - 0.3) / 0.25) * 0.72;
  if (t < 0.7) return 0.72;
  return 0.72;
}

export function stationOf(progress: number): Station {
  const t = clamp(progress, 0, 1);
  if (t < 0.28) return "canvas";
  if (t < 0.7) return "stamp";
  return "gradebook";
}

export function readoutOf(progress: number): string {
  const station = stationOf(progress);
  if (station === "canvas") return "Canvas course · ticket waiting";
  if (station === "stamp") {
    const press = stampOf(progress);
    if (press > 0.2) return "SOL · matching rubric · score locked";
    return "SOL activity · scoring";
  }
  return "Grade back in Canvas gradebook";
}

export function spokenOf(progress: number): string {
  return readoutOf(progress);
}

function clamp(value: number, low: number, high: number) {
  return Math.min(high, Math.max(low, value));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function ease(t: number) {
  const u = clamp(t, 0, 1);
  return u * u * (3 - 2 * u);
}
