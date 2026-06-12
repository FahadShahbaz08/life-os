// Life OS — Core type definitions

export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type ProjectStatus = 'not_started' | 'in_progress' | 'waiting' | 'completed' | 'archived';
export type TaskStatus = 'todo' | 'in_progress' | 'waiting' | 'completed' | 'archived';
export type FocusQueue = 'now' | 'next' | 'later';
export type InboxType = 'idea' | 'reminder' | 'thought' | 'task' | 'business' | 'learning' | 'plan';
export type GoalHorizon = 'short_term' | 'quarterly' | 'annual' | 'long_term';
export type GoalStatus = 'active' | 'paused' | 'completed' | 'abandoned';
export type HabitFrequency = 'daily' | 'weekly' | 'monthly';
export type NoteCategory = 'trading' | 'unity' | 'game_dev' | 'finance' | 'business' | 'books' | 'ideas' | 'learning' | 'journal' | 'general';
export type ReminderStatus = 'pending' | 'sent' | 'dismissed' | 'snoozed';
export type WaitingStatus = 'waiting' | 'follow_up_needed' | 'completed';
export type FinanceReceivableStatus = 'pending' | 'partial' | 'collected' | 'written_off';
export type FinancePayableStatus = 'pending' | 'partial' | 'paid';
export type ExpenseCategory = 'food' | 'gym' | 'software' | 'fuel' | 'family' | 'entertainment' | 'business' | 'other';
export type VisionType = 'one_year' | 'three_year' | 'five_year' | 'bucket_list' | 'dream_project';
export type FocusSessionType = 'work' | 'short_break' | 'long_break';
export type Mood = 'great' | 'good' | 'okay' | 'rough';

export interface Area {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  sortOrder: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  areaId: string;
  name: string;
  description: string;
  priority: Priority;
  status: ProjectStatus;
  progressPercent: number;
  deadline: string | null;
  notes: string;
  linkedGoalIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  areaId: string | null;
  projectId: string | null;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
  dueTime: string | null;
  reminderAt: string | null;
  isRecurring: boolean;
  recurrenceRule: string | null;
  focusQueue: FocusQueue | null;
  tags: string[];
  progressNotes: string;
  isTopPriority: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InboxItem {
  id: string;
  content: string;
  type: InboxType;
  processed: boolean;
  convertedToType: 'task' | 'note' | 'goal' | 'reminder' | 'waiting_for' | null;
  convertedToId: string | null;
  createdAt: string;
}

export interface Goal {
  id: string;
  areaId: string | null;
  title: string;
  description: string;
  category: string;
  horizon: GoalHorizon;
  targetValue: number | null;
  currentValue: number;
  unit: string;
  targetDate: string | null;
  status: GoalStatus;
  linkedProjectIds: string[];
  linkedHabitIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Habit {
  id: string;
  areaId: string | null;
  name: string;
  description: string;
  frequency: HabitFrequency;
  scheduleDays: number[];
  targetCount: number;
  unit: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HabitCompletion {
  id: string;
  habitId: string;
  completedAt: string;
  value: number;
  notes: string;
}

export interface Note {
  id: string;
  areaId: string | null;
  title: string;
  content: string;
  summary: string;
  keyInsights: string;
  actionItems: string;
  references: string;
  category: NoteCategory;
  tags: string[];
  linkedProjectIds: string[];
  linkedGoalIds: string[];
  source: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  id: string;
  title: string;
  description: string;
  remindAt: string;
  recurrenceRule: string | null;
  priority: Priority;
  linkedType: 'task' | 'waiting_for' | 'finance' | null;
  linkedId: string | null;
  status: ReminderStatus;
  createdAt: string;
}

export interface WaitingFor {
  id: string;
  areaId: string | null;
  projectId: string | null;
  title: string;
  person: string;
  description: string;
  status: WaitingStatus;
  followUpDate: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface FinanceReceivable {
  id: string;
  person: string;
  amount: number;
  currency: string;
  dueDate: string | null;
  notes: string;
  status: FinanceReceivableStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FinancePayable {
  id: string;
  person: string;
  amount: number;
  currency: string;
  dueDate: string | null;
  notes: string;
  status: FinancePayableStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceExpense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  date: string;
  description: string;
  areaId: string | null;
  createdAt: string;
}

export interface VisionItem {
  id: string;
  type: VisionType;
  title: string;
  description: string;
  targetYear: number | null;
  sortOrder: number;
  linkedGoalId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyReview {
  id: string;
  weekStart: string;
  weekEnd: string;
  completedItems: string[];
  notCompletedItems: string[];
  lessonsLearned: string;
  nextWeekPriorities: string[];
  goalProgressNotes: string;
  createdAt: string;
}

export interface FocusSession {
  id: string;
  taskId: string | null;
  areaId: string | null;
  projectId: string | null;
  completedAt: string;
  duration: number;
  type: FocusSessionType;
  label: string;
}

export interface ActivityEntry {
  id: string;
  type: string;
  message: string;
  entityType?: string;
  entityId?: string;
  timestamp: string;
}

export type TradeStatus = 'open' | 'closed';

export interface Trade {
  id: string;
  pair: string;
  investedAmount: number;
  currency: string;
  openedAt: string;
  closedAt: string | null;
  profitLoss: number | null;
  status: TradeStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  topPriorityTaskIds: string[];
  userName: string;
  notificationsEnabled: boolean;
  notifiedReminderIds: string[];
}

export interface AppState {
  areas: Area[];
  projects: Project[];
  tasks: Task[];
  inboxItems: InboxItem[];
  goals: Goal[];
  habits: Habit[];
  habitCompletions: HabitCompletion[];
  notes: Note[];
  reminders: Reminder[];
  waitingFor: WaitingFor[];
  receivables: FinanceReceivable[];
  payables: FinancePayable[];
  expenses: FinanceExpense[];
  visionItems: VisionItem[];
  weeklyReviews: WeeklyReview[];
  focusSessions: FocusSession[];
  trades: Trade[];
  activity: ActivityEntry[];
  settings: AppSettings;
}

export interface FilterState {
  search: string;
  status: string;
  priority: string;
  dueDateFilter: 'all' | 'today' | 'this_week' | 'overdue';
  sortBy: 'deadline' | 'priority' | 'name' | 'created';
  sortOrder: 'asc' | 'desc';
  areaId: string | null;
}

export interface DashboardStats {
  totalProjects: number;
  completedProjects: number;
  pendingTasks: number;
  overdueTasks: number;
  todaysTasks: number;
  inProgressProjects: number;
}

export interface TodayDashboard {
  focusNow: Task | null;
  topPriorities: Task[];
  todaysTasks: Task[];
  overdueTasks: Task[];
  todaysHabits: { habit: Habit; completed: boolean }[];
  upcomingReminders: Reminder[];
  waitingFollowUps: WaitingFor[];
  financeAlerts: {
    totalReceivables: number;
    totalPayables: number;
    monthlyExpenses: number;
    upcomingPayables: FinancePayable[];
  };
  goalProgress: Goal[];
}

export interface FocusQueueData {
  now: Task[];
  next: Task[];
  later: Task[];
}

export interface SearchResult {
  type: 'task' | 'note' | 'project' | 'goal' | 'habit' | 'area';
  id: string;
  title: string;
  subtitle: string;
}

export interface PomodoroStats {
  totalSessions: number;
  totalMinutes: number;
  currentStreak: number;
  longestStreak: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
}

// Legacy TaskFlow types for migration
export interface LegacyTask {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: Priority;
  dueDate: string | null;
  progressNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface LegacyProject {
  id: string;
  name: string;
  client: string;
  priority: Priority;
  status: 'not_started' | 'in_progress' | 'waiting' | 'completed';
  deadline: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
  tasks: LegacyTask[];
}

export interface LegacyLearning {
  id: string;
  title: string;
  content: string;
  tags: string[];
  source: string;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LegacyDevLogEntry {
  id: string;
  date: string;
  projectId: string | null;
  title: string;
  content: string;
  mood: Mood;
  createdAt: string;
  updatedAt: string;
}

export interface LegacyAppState {
  projects?: LegacyProject[];
  activity?: ActivityEntry[];
  devLog?: LegacyDevLogEntry[];
  learnings?: LegacyLearning[];
  pomodoroSessions?: FocusSession[];
}
