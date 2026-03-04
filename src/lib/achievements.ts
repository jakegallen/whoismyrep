// ── Achievement Registry ──
// Pure config — no side effects. Keys match `user_achievements.achievement_key`.

export interface Achievement {
  name: string;
  desc: string;
  icon: string;
  xp: number;
  category: AchievementCategory;
}

export type AchievementCategory =
  | "basics"
  | "exploration"
  | "streaks"
  | "knowledge"
  | "challenges"
  | "saving";

export const ACHIEVEMENT_CATEGORIES: Record<AchievementCategory, string> = {
  basics: "Getting Started",
  exploration: "Exploration",
  streaks: "Streaks",
  knowledge: "Knowledge",
  challenges: "Challenges",
  saving: "Saving",
};

export const ACHIEVEMENTS: Record<string, Achievement> = {
  // Getting started
  first_save: {
    name: "First Save",
    desc: "Save your first representative",
    icon: "Heart",
    xp: 25,
    category: "basics",
  },
  home_state: {
    name: "Home Turf",
    desc: "Set your home state",
    icon: "MapPin",
    xp: 20,
    category: "basics",
  },
  district_set: {
    name: "District Insider",
    desc: "Set your congressional district",
    icon: "Map",
    xp: 20,
    category: "basics",
  },

  // Exploration
  bill_reader_10: {
    name: "Bill Reader",
    desc: "Read 10 different bills",
    icon: "FileText",
    xp: 50,
    category: "exploration",
  },
  bill_reader_50: {
    name: "Legislative Scholar",
    desc: "Read 50 different bills",
    icon: "BookOpen",
    xp: 150,
    category: "exploration",
  },
  rep_explorer_10: {
    name: "Rep Explorer",
    desc: "View 10 different politicians",
    icon: "Users",
    xp: 50,
    category: "exploration",
  },
  stock_watcher: {
    name: "Stock Watcher",
    desc: "Check congressional stock trades",
    icon: "TrendingUp",
    xp: 30,
    category: "exploration",
  },
  lobbyist_tracker: {
    name: "Follow the Money",
    desc: "Explore lobbying data",
    icon: "DollarSign",
    xp: 30,
    category: "exploration",
  },
  court_observer: {
    name: "Court Observer",
    desc: "View federal court cases",
    icon: "Scale",
    xp: 30,
    category: "exploration",
  },

  // Streaks
  streak_7: {
    name: "Week Warrior",
    desc: "7-day streak",
    icon: "Flame",
    xp: 75,
    category: "streaks",
  },
  streak_30: {
    name: "Monthly Maven",
    desc: "30-day streak",
    icon: "Flame",
    xp: 200,
    category: "streaks",
  },
  streak_100: {
    name: "Centurion",
    desc: "100-day streak",
    icon: "Flame",
    xp: 500,
    category: "streaks",
  },

  // Knowledge
  quiz_first: {
    name: "Quiz Taker",
    desc: "Answer your first quiz question",
    icon: "Brain",
    xp: 25,
    category: "knowledge",
  },
  quiz_perfect: {
    name: "Perfect Score",
    desc: "Get all daily quiz questions right",
    icon: "Star",
    xp: 50,
    category: "knowledge",
  },

  // Challenges
  challenge_first: {
    name: "Challenge Accepted",
    desc: "Complete your first daily challenge",
    icon: "Target",
    xp: 25,
    category: "challenges",
  },
  challenge_7: {
    name: "Challenger",
    desc: "Complete 7 daily challenges",
    icon: "Target",
    xp: 100,
    category: "challenges",
  },

  // Saving
  save_5_reps: {
    name: "Watchdog",
    desc: "Save 5 representatives",
    icon: "Eye",
    xp: 50,
    category: "saving",
  },
  save_5_bills: {
    name: "Bill Tracker",
    desc: "Save 5 bills",
    icon: "Bookmark",
    xp: 50,
    category: "saving",
  },
} as const;

export const TOTAL_ACHIEVEMENTS = Object.keys(ACHIEVEMENTS).length;
