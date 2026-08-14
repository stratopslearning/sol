"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

/** CSS pixels between grid cells. Dots are 1×1, so the lattice stays visible. */
const CELL = 3;
const DOT = 1;

type Cell = {
  x: number;
  y: number;
  base: number;
  alpha: number;
  target: number;
  until: number;
  ease: number;
};

function randomTarget() {
  const roll = Math.random();
  if (roll < 0.2) return 0.04 + Math.random() * 0.1;
  if (roll < 0.32) return 0.82 + Math.random() * 0.18;
  return 0.28 + Math.random() * 0.5;
}

function randomHold() {
  return 140 + Math.random() * 1600;
}

function seedGrid(width: number, height: number): Cell[] {
  const cols = Math.ceil(width / CELL);
  const rows = Math.ceil(height / CELL);
  const cells: Cell[] = [];

  for (let row = 0; row < rows; row++) {
    const ny = rows <= 1 ? 1 : row / (rows - 1);
    const bottom = Math.pow(ny, 2.15);

    for (let col = 0; col < cols; col++) {
      const nx = cols <= 1 ? 0.5 : col / (cols - 1);
      const fromCenter = Math.abs(nx - 0.5) * 2;
      const side = 1 - Math.pow(fromCenter, 1.8) * 0.45;
      const chance = 0.018 + bottom * 0.5 * side;

      if (Math.random() > chance) continue;

      const alpha = randomTarget();
      cells.push({
        x: col * CELL,
        y: row * CELL,
        base: 0.22 + bottom * 0.5 + Math.random() * 0.18,
        alpha,
        target: randomTarget(),
        until: Math.random() * 900,
        ease: 5 + Math.random() * 16,
      });
    }
  }

  return cells;
}

function readToken(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function TwinklePixels({ className }: { className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let brand = readToken("--brand");
    let isDark = document.documentElement.classList.contains("dark");
    let cells: Cell[] = [];
    let raf = 0;
    let visible = true;
    let running = true;

    const resize = () => {
      const next = wrap.getBoundingClientRect();
      width = Math.max(1, Math.floor(next.width));
      height = Math.max(1, Math.floor(next.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      cells = seedGrid(width, height);
    };

    const refreshColors = () => {
      brand = readToken("--brand");
      isDark = document.documentElement.classList.contains("dark");
    };

    let last = 0;

    const draw = (time: number) => {
      const dt = last ? Math.min(0.05, (time - last) / 1000) : 0.016;
      last = time;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = brand;
      const theme = isDark ? 1 : 0.9;

      for (const cell of cells) {
        if (time >= cell.until) {
          cell.target = randomTarget();
          cell.until = time + randomHold();
        }
        cell.alpha += (cell.target - cell.alpha) * (1 - Math.exp(-dt * cell.ease));
        ctx.globalAlpha = cell.base * cell.alpha * theme;
        ctx.fillRect(cell.x, cell.y, DOT, DOT);
      }

      ctx.globalAlpha = 1;
    };

    const loop = (time: number) => {
      if (!running || !visible) return;
      draw(time);
      if (!reduceMotion) raf = requestAnimationFrame(loop);
    };

    resize();
    refreshColors();
    draw(0);
    if (!reduceMotion) raf = requestAnimationFrame(loop);

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const io = new IntersectionObserver(
      ([entry]) => {
        const nowVisible = entry?.isIntersecting ?? true;
        if (nowVisible && !visible && !reduceMotion) {
          visible = true;
          raf = requestAnimationFrame(loop);
        } else {
          visible = nowVisible;
        }
      },
      { rootMargin: "80px" },
    );
    io.observe(wrap);

    const mo = new MutationObserver(refreshColors);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className={cn(
        "pointer-events-none",
        "[mask-image:linear-gradient(to_top,black_0%,rgba(0,0,0,0.85)_38%,transparent_100%),radial-gradient(ellipse_90%_80%_at_50%_100%,black,transparent)]",
        "[mask-composite:intersect]",
        "[-webkit-mask-image:linear-gradient(to_top,black_0%,rgba(0,0,0,0.85)_38%,transparent_100%),radial-gradient(ellipse_90%_80%_at_50%_100%,black,transparent)]",
        "[-webkit-mask-composite:source-in]",
        className,
      )}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
