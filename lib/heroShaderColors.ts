import type { ComponentProps } from "react";
import type { ColorPanels } from "@paper-design/shaders-react";

type ShaderProps = Partial<ComponentProps<typeof ColorPanels>>;

/** SOL brand / accent palette for Paper Design ColorPanels shader */
const SOL_SHADER_COLORS = [
  "#3a6b58", // brand — forest green
  "#c97a45", // accent — terracotta
  "#5f9a82", // mid green
  "#e8b07a", // warm sand
] as const;

const SOL_SHADER_COLORS_DARK = [
  "#6ecfaa", // brand — lifted for dark paper
  "#e89555", // accent
  "#4a8f72",
  "#f0c090",
] as const;

const sharedShaderSettings: ShaderProps = {
  density: 4.8,
  angle1: 0.68,
  angle2: 0.28,
  length: 1.13,
  edges: true,
  blur: 0.28,
  fadeIn: 0.85,
  fadeOut: 0.32,
  gradient: 0.52,
  speed: 3.2,
  scale: 0.94,
  rotation: 180,
};

export function getSolShaderProps(options?: {
  reducedMotion?: boolean;
  dark?: boolean;
}): { desktop: ShaderProps; mobile: ShaderProps } {
  const colors = options?.dark
    ? [...SOL_SHADER_COLORS_DARK]
    : [...SOL_SHADER_COLORS];

  const speed = options?.reducedMotion ? 0 : sharedShaderSettings.speed;

  const base: ShaderProps = {
    ...sharedShaderSettings,
    colors,
    colorBack: options?.dark ? "#1a191800" : "#ffffff00",
    speed,
  };

  return {
    desktop: {
      ...base,
      width: 1280,
      height: 720,
    },
    mobile: {
      ...base,
      style: { height: "100%", width: "100%" },
    },
  };
}
