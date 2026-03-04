/**
 * Shared party normalization utility.
 * Used by county-utils, school-board-utils, and municipal-utils
 * to avoid duplication and drift.
 */
export function normalizeParty(raw: string): string {
  if (!raw) return "Nonpartisan";
  const l = raw.toLowerCase();
  if (l.includes("democrat")) return "Democrat";
  if (l.includes("republican")) return "Republican";
  if (l.includes("libertarian")) return "Libertarian";
  if (l.includes("nonpartisan") || l === "unknown" || l === "")
    return "Nonpartisan";
  return raw;
}
