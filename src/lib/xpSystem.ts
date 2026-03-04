// ── XP & Level pure functions ──

/** XP required to reach a given level (cumulative). Level 1 = 0 XP. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  // Triangular: 100 * n * (n+1) / 2 summed from 2..level
  // Simplified: xp = 50 * level * (level + 1) - 100
  return 50 * level * (level + 1) - 100;
}

/** Derive level from total XP. */
export function levelFromXP(xp: number): number {
  // Invert xpForLevel: solve 50*n*(n+1) - 100 <= xp
  // 50n^2 + 50n - 100 - xp <= 0
  // n = (-50 + sqrt(2500 + 200*(100+xp))) / 100
  let level = 1;
  while (xpForLevel(level + 1) <= xp) {
    level++;
    if (level > 999) break; // safety
  }
  return level;
}

/** XP needed for next level from current total. */
export function xpToNextLevel(xp: number): number {
  const currentLevel = levelFromXP(xp);
  return xpForLevel(currentLevel + 1) - xp;
}

/** Progress percentage toward next level (0-100). */
export function xpProgressPercent(xp: number): number {
  const currentLevel = levelFromXP(xp);
  const currentLevelXP = xpForLevel(currentLevel);
  const nextLevelXP = xpForLevel(currentLevel + 1);
  const range = nextLevelXP - currentLevelXP;
  if (range <= 0) return 100;
  return Math.min(100, Math.round(((xp - currentLevelXP) / range) * 100));
}

// ── XP Action Config ──

export interface XPAction {
  xp: number;
  cooldown: "once" | "daily" | "daily_unique" | "unique" | "per-question";
}

export const XP_ACTIONS: Record<string, XPAction> = {
  daily_login:       { xp: 25,  cooldown: "daily" },
  save_rep:          { xp: 10,  cooldown: "unique" },
  save_bill:         { xp: 10,  cooldown: "unique" },
  read_bill:         { xp: 5,   cooldown: "daily_unique" },
  read_politician:   { xp: 5,   cooldown: "daily_unique" },
  view_stock_trades: { xp: 5,   cooldown: "daily" },
  view_campaign_fin: { xp: 5,   cooldown: "daily" },
  quiz_correct:      { xp: 15,  cooldown: "per-question" },
  complete_challenge:{ xp: 50,  cooldown: "daily" },
  set_home_state:    { xp: 20,  cooldown: "once" },
  set_home_district: { xp: 20,  cooldown: "once" },
  achievement_unlock:{ xp: 0,   cooldown: "unique" },
} as const;

/** Streak bonus XP: streak_days * 5. */
export function streakBonus(streakDays: number): number {
  return streakDays * 5;
}

// ── Level Names ──

export function levelName(level: number): string {
  if (level >= 50) return "Civic Champion";
  if (level >= 40) return "Policy Expert";
  if (level >= 30) return "Political Analyst";
  if (level >= 20) return "Civic Scholar";
  if (level >= 15) return "Policy Wonk";
  if (level >= 10) return "Informed Citizen";
  if (level >= 7) return "Active Voter";
  if (level >= 5) return "Engaged Citizen";
  if (level >= 3) return "Curious Citizen";
  return "Newcomer";
}
