/**
 * Minimal class joiner. Deliberately not tailwind-merge — the component API
 * here exposes fixed variants rather than arbitrary overrides, so there is
 * nothing to de-duplicate and no reason to carry the dependency.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
