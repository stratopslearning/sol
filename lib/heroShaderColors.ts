import type { MeshGradientProps } from "@paper-design/shaders-react";

type MeshProps = Partial<MeshGradientProps>;

/** Soft paper-tinted mesh — forest, terracotta, sand (editorial, not neon). */
const MESH_LIGHT = [
  "#f7f4ef", // paper
  "#3a6b58", // brand
  "#c97a45", // accent
  "#8fafa0", // misted green
  "#e8d5c0", // warm sand
] as const;

const MESH_DARK = [
  "#1c1a18", // dark paper
  "#6ecfaa", // brand lifted
  "#e89555", // accent
  "#4a8f72", // mid green
  "#3a342e", // warm charcoal
] as const;

export function getSolMeshHeroProps(options?: {
  reducedMotion?: boolean;
  dark?: boolean;
}): {
  mesh: MeshProps;
  meshAccent: MeshProps;
} {
  const dark = Boolean(options?.dark);
  const speed = options?.reducedMotion ? 0 : 0.22;
  const accentSpeed = options?.reducedMotion ? 0 : 0.14;

  return {
    mesh: {
      colors: [...(dark ? MESH_DARK : MESH_LIGHT)],
      speed,
      distortion: 0.55,
      swirl: 0.18,
      grainMixer: 0.12,
      grainOverlay: 0.08,
      scale: 1,
      fit: "cover",
    },
    meshAccent: {
      colors: dark
        ? ["#1c1a18", "#6ecfaa", "#e89555", "#2a2826"]
        : ["#f7f4ef", "#ffffff", "#3a6b58", "#c97a45"],
      speed: accentSpeed,
      distortion: 0.35,
      swirl: 0.28,
      grainMixer: 0.05,
      grainOverlay: 0,
      scale: 1.05,
      fit: "cover",
      style: { opacity: dark ? 0.35 : 0.45 },
    },
  };
}
