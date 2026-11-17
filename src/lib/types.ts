export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  settings: Record<string, unknown>;
}

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  avatar: string;
  color: string;
  daily_goal_xp: number;
  weekly_goal_xp?: number;
  daily_goal_words?: number;
  xp: number;
  streak: number;
  best_streak: number;
  last_active_date: string | null;
  total_rounds: number;
  total_correct: number;
  total_answers: number;
  grade_sum: number;
  grade_count: number;
  created_at: string;
}

export interface LevelInfo {
  level: number;
  xpInto: number;
  xpNeeded: number;
  xp: number;
}

export interface Me {
  user: User;
  profile: Profile;
  isAdmin: boolean;
  isPremium?: boolean;
  premiumUntil?: string | null;
  dailyRoundLimit?: number | null;
  level: LevelInfo;
}

export interface PremiumStatus {
  isPremium: boolean;
  premiumUntil: string | null;
  isBusiness?: boolean;
  seats?: { id: string; member_email: string; member_name: string | null; created_at: string }[];
  seatLimit?: number;
  dailyUsed: number;
  dailyLimit: number | null;
  iban: string;
  price: string;
  cardPayment?: boolean;
  salesEnabled?: boolean;
  plans: { key: string; label: string; days: number; cents: number; seats?: number; enabled?: boolean; price: string }[];
  requests: { id: string; plan: string; amount_cents: number; status: string; note: string; created_at: string; decided_at: string | null }[];
}

export interface Difficulty {
  id: number;
  key: string;
  label: string;
  description: string;
  sort_order: number;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition_type: string;
  condition_value: number;
  unlocked?: boolean;
  unlockedAt?: string | null;
}

export interface Meta {
  difficulties: Difficulty[];
  rewards: Reward[];
  avatars: string[];
  colors: string[];
  modes: { key: string; label: string; desc: string }[];
  aiConfigured: boolean;
}

export interface RoundItem {
  itemId: number;
  prompt: string;
  index: number;
}

export interface RoundStart {
  roundId: string;
  mode: string;
  count: number;
  items: RoundItem[];
}

export type Verdict = 'correct' | 'phonetic' | 'wrong' | 'unclear';

export interface ItemResult {
  itemId: number;
  prompt: string;
  expected: string;
  given: string;
  verdict: Verdict;
  verdictLabel: string;
  points: number;
  maxPoints: number;
  feedback: string;
}

export interface RoundResult {
  roundId: string;
  mode: string;
  results: ItemResult[];
  score: number;
  maxScore: number;
  percent: number;
  grade: string;
  correctCount: number;
  totalCount: number;
  xpGained: number;
  level: { level: number; xp: number };
  streak: number;
  unlockedRewards: { id: string; name: string; description: string; icon: string }[];
}

export interface Stats {
  profile: Profile;
  level: LevelInfo;
  todayXp: number;
  dailyGoal: number;
  todayWords?: number;
  wordGoal?: number;
  weekXp?: number;
  weeklyGoal?: number;
  avgGrade: number | null;
  weekly: { day: string; rounds: number; avgPercent: number }[];
  mistakes: { word: string; display: string; wrong_count: number; phonetic_count: number; correct_count: number; unclear_count: number }[];
  strengths: { word: string; display: string; correct_count: number }[];
  recentRounds: { id: string; mode: string; percent: number; grade: string; score: number; max_score: number; created_at: string; finished_at: string }[];
}

export interface WordList {
  id: string;
  profile_id: string;
  name: string;
  description: string;
  difficulty: string | null;
  created_at: string;
  item_count?: number;
}

export interface ListItem {
  id: number;
  list_id: string;
  type: 'word' | 'sentence' | 'text';
  text: string;
  difficulty: string | null;
}
