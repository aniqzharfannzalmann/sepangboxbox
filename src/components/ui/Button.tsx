"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ComponentProps, type ReactNode, useState } from "react";
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
  "h-12 px-md transition-all duration-150 select-none relative " +
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
  isLoading?: boolean;
};

type ButtonAsButton = CommonProps &
  Omit<ComponentProps<"button">, keyof CommonProps> & { href?: never };

type ButtonAsLink = CommonProps &
  Omit<ComponentProps<typeof Link>, keyof CommonProps | "href"> & {
    href: string;
  };

export function Button(props: ButtonAsButton | ButtonAsLink) {
  const pathname = usePathname();
  const [navPending, setNavPending] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Reset nav pending state synchronously on route change per React guidelines
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setNavPending(false);
  }

  const isActuallyLoading = props.isLoading || navPending;

  const classes = cn(
    BASE,
    VARIANTS[props.variant ?? "primary"],
    isActuallyLoading && "opacity-85 pointer-events-none cursor-wait",
    props.className,
  );

  if (props.href !== undefined) {
    const { variant, className, children, href, isLoading, onClick, ...rest } = props;
    const isInternalPage =
      typeof href === "string" &&
      !href.startsWith("#") &&
      !href.startsWith("mailto:") &&
      !href.startsWith("tel:") &&
      !rest.target;

    return (
      <Link
        href={href}
        className={classes}
        onClick={(e) => {
          if (isInternalPage) {
            setNavPending(true);
            // Safety timeout to reset after 8s in case navigation is cancelled
            setTimeout(() => setNavPending(false), 8000);
          }
          onClick?.(e);
        }}
        {...rest}
      >
        {children}
        {isActuallyLoading && (
          <span
            className="ml-2 inline-block h-3.5 w-3.5 shrink-0 rounded-full border-2 border-current border-t-transparent animate-spin"
            aria-hidden="true"
          />
        )}
      </Link>
    );
  }

  const { variant, className, children, href, isLoading, disabled, ...rest } = props;
  return (
    <button
      className={classes}
      disabled={disabled || isActuallyLoading}
      {...rest}
    >
      {children}
      {isActuallyLoading && (
        <span
          className="ml-2 inline-block h-3.5 w-3.5 shrink-0 rounded-full border-2 border-current border-t-transparent animate-spin"
          aria-hidden="true"
        />
      )}
    </button>
  );
}
