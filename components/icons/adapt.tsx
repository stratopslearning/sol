"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

import {
  iconHandles,
  type AnimatedIconHandle,
} from "@/components/icons/runtime";

type SizeProps = {
  size?: number | string;
  className?: string;
  /** Keep animation playing (e.g. active nav item). */
  active?: boolean;
};

function resolveSize(
  size: number | string | undefined,
  className: string | undefined,
): number {
  if (typeof size === "number" && Number.isFinite(size)) return size;
  if (typeof size === "string") {
    const n = Number.parseFloat(size);
    if (Number.isFinite(n)) return n;
  }
  return sizeFromClassName(className) ?? 16;
}

function sizeFromClassName(className?: string): number | undefined {
  if (!className) return undefined;
  const arbitrary = className.match(/\bh-\[(\d+(?:\.\d+)?)px\]/);
  if (arbitrary) return Number(arbitrary[1]);
  const step = className.match(/\bh-(\d+(?:\.\d+)?)\b/);
  if (!step) return undefined;
  const n = Number(step[1]);
  if (!Number.isFinite(n)) return undefined;
  return n * 4;
}

type AnimatedComponent = React.ForwardRefExoticComponent<
  React.HTMLAttributes<HTMLDivElement> &
    { size?: number } &
    React.RefAttributes<AnimatedIconHandle>
>;

/**
 * Wrap a lucide-animated icon so it:
 * - defaults to 16px (Lucide-ish) instead of 28
 * - registers for parent button/link hover & press
 * - supports `active` to hold the animated state
 */
export function adaptAnimatedIcon(
  Animated: AnimatedComponent,
  displayName: string,
) {
  const Hosted = React.forwardRef<
    AnimatedIconHandle,
    React.HTMLAttributes<HTMLDivElement> &
      SizeProps & { strokeWidth?: number; absoluteStrokeWidth?: boolean }
  >(function HostedIcon(
    {
      className,
      size,
      active = false,
      strokeWidth: _sw,
      absoluteStrokeWidth: _asw,
      ...props
    },
    ref,
  ) {
    const handleRef = React.useRef<AnimatedIconHandle | null>(null);
    const hostRef = React.useRef<HTMLSpanElement | null>(null);
    const resolvedSize = resolveSize(size, className);

    const setHandle = React.useCallback(
      (handle: AnimatedIconHandle | null) => {
        handleRef.current = handle;
        if (typeof ref === "function") ref(handle);
        else if (ref) ref.current = handle;
        const host = hostRef.current;
        if (host && handle) iconHandles.set(host, handle);
      },
      [ref],
    );

    React.useEffect(() => {
      const host = hostRef.current;
      if (host) host.dataset.iconActive = active ? "true" : "false";
      const handle = handleRef.current;
      if (!handle) return;
      if (active) handle.startAnimation();
      else handle.stopAnimation();
    }, [active]);

    return (
      <span
        ref={hostRef}
        data-animated-icon=""
        data-icon-active={active ? "true" : "false"}
        className={cn(
          "inline-flex shrink-0 items-center justify-center [&>div]:inline-flex",
          className,
        )}
        aria-hidden={props["aria-hidden"] as boolean | undefined}
        onMouseEnter={() => handleRef.current?.startAnimation()}
        onMouseLeave={() => {
          if (!active) handleRef.current?.stopAnimation();
        }}
      >
        <Animated
          {...props}
          ref={setHandle}
          size={resolvedSize}
          className="text-inherit"
          // Ref attachment puts lucide-animated into controlled mode (no auto-hover),
          // so we drive hover here and via IconInteractionProvider for parent triggers.
          onMouseEnter={(e) => {
            handleRef.current?.startAnimation();
            props.onMouseEnter?.(e);
          }}
          onMouseLeave={(e) => {
            if (!active) handleRef.current?.stopAnimation();
            props.onMouseLeave?.(e);
          }}
        />
      </span>
    );
  });

  Hosted.displayName = displayName;
  return Hosted;
}

/** Static Lucide fallback that still accepts `active` (no-op). */
export function adaptStaticIcon(
  // Lucide icons accept className/size/strokeWidth; keep this loose for ref forwarding.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Icon: React.ComponentType<any>,
  displayName: string,
) {
  const Static = React.forwardRef<
    SVGSVGElement,
    Omit<React.SVGProps<SVGSVGElement>, "ref"> & SizeProps
  >(function StaticIcon(
    { className, size, active: _active, strokeWidth, ...props },
    ref,
  ) {
    const resolvedSize = resolveSize(size, className);
    return (
      <Icon
        ref={ref}
        className={cn("shrink-0", className)}
        size={resolvedSize}
        strokeWidth={strokeWidth}
        {...props}
      />
    );
  });
  Static.displayName = displayName;
  return Static;
}
