import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Editorial body caps at 1280px; hero photography goes full-bleed past it. */
export function Container({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={cn("mx-auto w-full max-w-[1280px] px-xs md:px-md", className)}
    >
      {children}
    </div>
  );
}

/** design.md §badge-pill — the only place pill geometry is allowed. */
export function BadgePill({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "primary" | "info" | "success" | "warning";
  className?: string;
}) {
  const tones = {
    neutral: "bg-canvas-elevated text-ink",
    primary: "bg-primary text-on-primary",
    info: "bg-semantic-info text-canvas",
    success: "bg-semantic-success text-ink",
    warning: "bg-semantic-warning text-ink",
  } as const;

  return (
    <span
      className={cn(
        "label-caps inline-flex items-center rounded-full px-xxs py-xxxs",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Small uppercase label that introduces a band. */
export function SectionLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("label-caps text-muted", className)}>{children}</p>
  );
}

/**
 * design.md §spec-cell — a big number over an uppercase label.
 * `accent` switches it to race-position-cell, which renders in Rosso Corsa.
 */
export function SpecCell({
  value,
  label,
  accent = false,
  className,
}: {
  value: ReactNode;
  label: string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-xxs", className)}>
      <span
        className={cn(
          "text-number-display tnum",
          accent ? "text-primary" : "text-ink",
        )}
      >
        {value}
      </span>
      <span className="label-caps text-muted">{label}</span>
    </div>
  );
}

/** 1px divider. `onLight` switches to the light-band hairline colour. */
export function Hairline({
  onLight = false,
  className,
}: {
  onLight?: boolean;
  className?: string;
}) {
  return (
    <hr
      className={cn(
        "border-0 border-t h-px",
        onLight ? "border-hairline-on-light" : "border-hairline",
        className,
      )}
    />
  );
}
