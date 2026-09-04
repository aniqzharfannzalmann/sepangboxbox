import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant =
  | "primary"
  | "outline-on-dark"
  | "outline-on-light"
  | "tertiary-text";

/*
 * design.md §Buttons: every CTA is 0px corners, uppercase, 1.4px tracking,
 * 48px tall. Sharp corners are the brand button shape — never a rounded pill.
 *
 * design.md documents no hover state ("per the no-hover policy"). A real web
 * app needs one, so we use --color-primary-hover, which the token set already
 * defines. This is the single deliberate deviation from the design doc.
 */
const BASE =
  "uppercase-cta rounded-none inline-flex items-center justify-center " +
  "h-12 px-md transition-colors duration-150 select-none " +
  "disabled:opacity-50 disabled:pointer-events-none";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-active",
  "outline-on-dark":
    "bg-transparent text-ink border border-ink hover:bg-ink hover:text-canvas",
  "outline-on-light":
    "bg-transparent text-body-on-light border border-body-on-light " +
    "hover:bg-body-on-light hover:text-canvas-light",
  "tertiary-text":
    "bg-transparent text-ink h-auto px-0 underline underline-offset-4 " +
    "decoration-1 hover:decoration-2 hover:text-primary",
};

type CommonProps = {
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
};

type ButtonAsButton = CommonProps &
  Omit<ComponentProps<"button">, keyof CommonProps> & { href?: never };

type ButtonAsLink = CommonProps &
  Omit<ComponentProps<typeof Link>, keyof CommonProps | "href"> & {
    href: string;
  };

export function Button(props: ButtonAsButton | ButtonAsLink) {
  const classes = cn(
    BASE,
    VARIANTS[props.variant ?? "primary"],
    props.className,
  );

  if (props.href !== undefined) {
    const { variant, className, children, href, ...rest } = props;
    return (
      <Link href={href} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  const { variant, className, children, href, ...rest } = props;
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
