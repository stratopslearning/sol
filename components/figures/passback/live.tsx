"use client";

import * as React from "react";

import { translateAlong } from "@/components/iso/iso-kit";
import { IsoFigure } from "@/components/iso/react/draw";
import {
  asksForStillness,
  follow,
  useReadout,
} from "@/components/iso/react/live";

import { needlePath } from "./geometry";
import { needleOf, readoutOf, spokenOf, stampOf, xOf } from "./model";
import {
  HEIGHT,
  P,
  STAMP_DOWN_Z,
  STAMP_HOME_Z,
  WIDTH,
  X_CANVAS,
} from "./view";

const LOOP = 8.5;
const TOUR_FIRST = 1.2;
const TOUR_BACK = 2800;

function tourProgress(t: number): number {
  const at = t % LOOP;
  if (at < 0.5) return 0;
  if (at < 6.2) return Math.min(1, (at - 0.5) / 5.4);
  if (at < 7.2) return 1;
  return Math.max(0, 1 - (at - 7.2) / 1.0);
}

interface Props {
  label: string;
  base: React.ReactNode;
  rails: React.ReactNode;
  trays: React.ReactNode;
  press: React.ReactNode;
  dial: React.ReactNode;
  ticket: React.ReactNode;
  stamp: React.ReactNode;
  needle?: React.ReactNode;
}

export function PassbackLive(props: Props) {
  const root = React.useRef<HTMLDivElement>(null);
  const { anchor, say } = useReadout<HTMLDivElement>();
  const ticketRef = React.useRef<SVGGElement>(null);
  const stampRef = React.useRef<SVGGElement>(null);
  const needleRef = React.useRef<SVGPathElement>(null);
  const progress = React.useRef(0);
  const target = React.useRef(0);
  const clock = React.useRef(0);
  const frame = React.useRef(0);
  const last = React.useRef(0);
  const touring = React.useRef(true);
  const [visible, setVisible] = React.useState(false);
  const [idle, setIdle] = React.useState(true);
  const [poke, setPoke] = React.useState(0);

  const apply = React.useCallback(
    (value: number) => {
      progress.current = value;
      const x = xOf(value);
      const stamp = stampOf(value);
      const stampZ =
        STAMP_HOME_Z + (STAMP_DOWN_Z - STAMP_HOME_Z) * stamp;
      ticketRef.current?.setAttribute(
        "transform",
        translateAlong(P, [x - X_CANVAS, 0, 0]),
      );
      stampRef.current?.setAttribute(
        "transform",
        translateAlong(P, [0, 0, stampZ - STAMP_HOME_Z]),
      );
      needleRef.current?.setAttribute("d", needlePath(needleOf(value)));
      say(readoutOf(value));
      const node = root.current;
      if (node) {
        const spoken = spokenOf(value);
        if (node.getAttribute("aria-valuetext") !== spoken) {
          node.setAttribute("aria-valuetext", spoken);
        }
        const now = `${Math.round(value * 100)}`;
        if (node.getAttribute("aria-valuenow") !== now) {
          node.setAttribute("aria-valuenow", now);
        }
      }
    },
    [say],
  );

  const stop = React.useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
  }, []);

  const run = React.useCallback(() => {
    if (frame.current) return;
    last.current = 0;
    const tick = (now: number) => {
      const dt = last.current
        ? Math.min((now - last.current) / 1000, 1 / 30)
        : 1 / 60;
      last.current = now;
      const calm = asksForStillness();
      if (touring.current) {
        clock.current += dt;
        target.current = tourProgress(clock.current);
      }
      const next = follow(progress.current, target.current, dt, 0.12, calm);
      apply(next);
      const settled = Math.abs(next - target.current) < 0.001;
      frame.current =
        !settled || touring.current ? requestAnimationFrame(tick) : 0;
    };
    frame.current = requestAnimationFrame(tick);
  }, [apply]);

  React.useEffect(() => {
    const node = root.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) =>
      setVisible(Boolean(entries.at(-1)?.isIntersecting)),
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      stop();
    };
  }, [stop]);

  React.useEffect(() => {
    if (!visible) {
      touring.current = false;
      stop();
      return;
    }
    if (idle && !asksForStillness()) {
      const timer = window.setTimeout(() => {
        clock.current = 0;
        touring.current = true;
        run();
      }, TOUR_FIRST * 1000);
      return () => {
        window.clearTimeout(timer);
        touring.current = false;
      };
    }
    touring.current = false;
    run();
  }, [visible, idle, poke, run, stop]);

  React.useEffect(() => {
    if (idle) return;
    const timer = window.setTimeout(() => setIdle(true), TOUR_BACK);
    return () => window.clearTimeout(timer);
  }, [idle, poke]);

  const wake = () => {
    setIdle(false);
    touring.current = false;
    setPoke((n) => n + 1);
  };

  const setProgress = (value: number) => {
    wake();
    target.current = Math.min(1, Math.max(0, value));
    run();
  };

  const step = (delta: number) => setProgress(target.current + delta);

  return (
    <div
      ref={(node) => {
        root.current = node;
        anchor.current = node;
      }}
      className="passback"
      role="slider"
      tabIndex={0}
      aria-label="Grade passback desk: Canvas course, SOL activity, Canvas gradebook"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
      aria-valuetext={spokenOf(0)}
      onPointerDown={(event) => {
        const box = event.currentTarget.getBoundingClientRect();
        if (!box.width) return;
        const u = (event.clientX - box.left) / box.width;
        setProgress(u);
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
        const box = event.currentTarget.getBoundingClientRect();
        if (!box.width) return;
        setProgress((event.clientX - box.left) / box.width);
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowUp") {
          event.preventDefault();
          step(0.08);
        } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
          event.preventDefault();
          step(-0.08);
        } else if (event.key === "Home") {
          event.preventDefault();
          setProgress(0);
        } else if (event.key === "End") {
          event.preventDefault();
          setProgress(1);
        } else if (event.key === " ") {
          event.preventDefault();
          setProgress(target.current < 0.95 ? 1 : 0);
        }
      }}
    >
      <IsoFigure width={WIDTH} height={HEIGHT} label={props.label}>
        {props.base}
        {props.rails}
        {props.trays}
        {props.press}
        {props.dial}
        <g ref={stampRef}>{props.stamp}</g>
        <g ref={ticketRef}>{props.ticket}</g>
        <path
          ref={needleRef}
          className="iso-line"
          data-tone="lit"
          d={needlePath(0)}
        />
      </IsoFigure>
    </div>
  );
}
