import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The app's honesty channel.
 *
 * PRD section 8 requires graceful degradation with a visible status message —
 * never a broken or silently-stale page. Anything rendered from a fallback,
 * a snapshot, or a lower-fidelity data source says so here.
 */
export function StatusNotice({
  tone = "info",
  children,
  className,
}: {
  tone?: "info" | "warning";
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      role="status"
      className={cn(
        "text-body-sm flex items-start gap-xxs border-l-2 pl-xs py-xxs",
        tone === "warning"
          ? "border-semantic-warning text-body"
          : "border-semantic-info text-body",
        className,
      )}
    >
      {children}
    </p>
  );
}
