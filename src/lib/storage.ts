import {
  AppState, ActivityEntry, LegacyAppState, LegacyProject, Task, Project,
  Note, FocusSession, PomodoroStats, AppSettings, Area,
} from '@/types';
import { generateId } from './utils';
import { createDefaultAreas, STORAGE_KEY, LEGACY_STORAGE_KEY } from './constants';

const DEFAULT_SETTINGS: AppSettings = {
  topPriorityTaskIds: [],
  userName: '',
  notificationsEnabled: false,
  notifiedReminderIds: [],
  googleCalendarSyncEnabled: true,
  defaultFollowUpIntervalMinutes: 30,
};

export function createEmptyState(): AppState {
  return {
    areas: createDefaultAreas(),
    projects: [],
    tasks: [],
    inboxItems: [],
    goals: [],
    habits: [],
    habitCompletions: [],
    notes: [],
    reminders: [],
    waitingFor: [],
    receivables: [],
    payables: [],
    expenses: [],
    incomes: [],
    visionItems: [],
    weeklyReviews: [],
    focusSessions: [],
    trades: [],
    activity: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

function mapLegacyTaskStatus(status: string): Task['status'] {
  if (status === 'done') return 'completed';
  if (status === 'waiting') return 'waiting';
  if (status === 'in_progress') return 'in_progress';
  return 'todo';
}

function mapLegacyProjectStatus(status: string): Project['status'] {
  if (status === 'completed') return 'completed';
  if (status === 'waiting') return 'waiting';
  if (status === 'in_progress') return 'in_progress';
  return 'not_started';
}

function migrateFromLegacy(raw: LegacyAppState): AppState {
  const state = createEmptyState();
  const careerArea = state.areas.find(a => a.slug === 'work' || a.slug === 'career') ?? state.areas[0];
  const learningArea = state.areas.find(a => a.slug === 'growth' || a.slug === 'learning') ?? state.areas[0];

  const projects: Project[] = (raw.projects ?? []).map((p: LegacyProject) => ({
    id: p.id,
    areaId: careerArea.id,
    name: p.name,
    description: p.client ? `Client: ${p.client}` : '',
    priority: p.priority,
    status: mapLegacyProjectStatus(p.status),
    progressPercent: p.tasks?.length
      ? Math.round((p.tasks.filter(t => t.status === 'done').length / p.tasks.length) * 100)
      : 0,
    deadline: p.deadline,
    notes: p.notes,
    linkedGoalIds: [],
    tags: ['career'],
    isPinned: false,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));

  const tasks: Task[] = (raw.projects ?? []).flatMap((p: LegacyProject) =>
    (p.tasks ?? []).map(t => ({
      id: t.id,
      areaId: careerArea.id,
      projectId: p.id,
      title: t.title,
      description: t.description,
      status: mapLegacyTaskStatus(t.status),
      priority: t.priority,
      dueDate: t.dueDate,
      dueTime: null,
      reminderAt: null,
      isRecurring: false,
      recurrenceRule: null,
      focusQueue: null,
      tags: [],
      progressNotes: t.progressNotes,
      isTopPriority: false,
      googleEventId: null,
      followUpIntervalMinutes: null,
      completedAt: t.status === 'done' ? t.updatedAt : null,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }))
  );

  const notes: Note[] = [
    ...(raw.learnings ?? []).map(l => ({
      id: l.id,
      areaId: learningArea.id,
      title: l.title,
      content: l.content,
      summary: '',
      keyInsights: '',
      actionItems: '',
      references: '',
      category: 'learning' as const,
      tags: l.tags,
      linkedProjectIds: l.projectId ? [l.projectId] : [],
      linkedGoalIds: [],
      source: l.source,
      isPinned: false,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
    })),
    ...(raw.devLog ?? []).map(d => ({
      id: d.id,
      areaId: null,
      title: d.title || `Journal — ${d.date}`,
      content: d.content,
      summary: '',
      keyInsights: '',
      actionItems: '',
      references: '',
      category: 'journal' as const,
      tags: [d.mood],
      linkedProjectIds: d.projectId ? [d.projectId] : [],
      linkedGoalIds: [],
      source: d.date,
      isPinned: false,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    })),
  ];

  const focusSessions: FocusSession[] = (raw.pomodoroSessions ?? []) as FocusSession[];

  return {
    ...state,
    projects,
    tasks,
    notes,
    focusSessions,
    trades: [],
    activity: raw.activity ?? [],
  };
}

function normalizeProjects(projects: Project[] | undefined, areas: Area[]): Project[] {
  return (projects ?? []).map(p => {
    const raw = p as Project & { tags?: string[]; isPinned?: boolean };
    let tags = raw.tags?.length ? [...raw.tags] : [];
    if (tags.length === 0 && raw.areaId) {
      const area = areas.find(a => a.id === raw.areaId);
      if (area) tags.push(area.slug);
    }
    if (tags.length === 0) tags = ['personal'];
    return {
      ...raw,
      areaId: raw.areaId ?? null,
      tags,
      isPinned: raw.isPinned ?? false,
    };
  });
}

export function normalizeState(parsed: Partial<AppState>): AppState {
  const empty = createEmptyState();
  const areas = parsed.areas?.length ? parsed.areas : empty.areas;
  const tasks = (parsed.tasks ?? []).map(t => ({
    ...t,
    googleEventId: t.googleEventId ?? null,
    followUpIntervalMinutes: t.followUpIntervalMinutes ?? null,
  }));
  return {
    areas,
    projects: normalizeProjects(parsed.projects, areas),
    tasks,
    inboxItems: parsed.inboxItems ?? [],
    goals: parsed.goals ?? [],
    habits: parsed.habits ?? [],
    habitCompletions: parsed.habitCompletions ?? [],
    notes: parsed.notes ?? [],
    reminders: parsed.reminders ?? [],
    waitingFor: parsed.waitingFor ?? [],
    receivables: parsed.receivables ?? [],
    payables: parsed.payables ?? [],
    expenses: parsed.expenses ?? [],
    incomes: parsed.incomes ?? [],
    visionItems: parsed.visionItems ?? [],
    weeklyReviews: parsed.weeklyReviews ?? [],
    focusSessions: parsed.focusSessions ?? [],
    trades: parsed.trades ?? [],
    activity: parsed.activity ?? [],
    settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
  };
}

export function loadState(): AppState {
  if (typeof window === 'undefined') return createEmptyState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return normalizeState(JSON.parse(raw) as Partial<AppState>);
    }
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const migrated = migrateFromLegacy(JSON.parse(legacy) as LegacyAppState);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
    return createEmptyState();
  } catch {
    return createEmptyState();
  }
}

export function saveState(state: AppState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Life OS: failed to save to localStorage', err);
  }
}

export function exportData(state: AppState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lifeos-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importData(file: File): Promise<AppState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed.projects && parsed.projects[0]?.tasks) {
          resolve(migrateFromLegacy(parsed as LegacyAppState));
        } else if (parsed.areas || parsed.tasks) {
          resolve(normalizeState(parsed as Partial<AppState>));
        } else {
          throw new Error('Invalid backup file');
        }
      } catch {
        reject(new Error('Invalid JSON backup file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export function createActivity(
  type: string,
  message: string,
  entityType?: string,
  entityId?: string
): ActivityEntry {
  return {
    id: generateId(),
    type,
    message,
    entityType,
    entityId,
    timestamp: new Date().toISOString(),
  };
}

const XP_PER_SESSION = 25;
const XP_PER_LEVEL = 200;

export function computePomodoroStats(sessions: FocusSession[]): PomodoroStats {
  const workSessions = sessions.filter(s => s.type === 'work');
  const totalSessions = workSessions.length;
  const totalMinutes = workSessions.reduce((acc, s) => acc + s.duration, 0);
  const totalXP = totalSessions * XP_PER_SESSION;
  const level = Math.floor(totalXP / XP_PER_LEVEL) + 1;
  const xp = totalXP % XP_PER_LEVEL;

  const sessionDays = new Set(workSessions.map(s => s.completedAt.split('T')[0]));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    if (sessionDays.has(key)) streak++;
    else if (i > 0) break;
  }

  return {
    totalSessions,
    totalMinutes,
    currentStreak: streak,
    longestStreak: streak,
    level,
    xp,
    xpToNextLevel: XP_PER_LEVEL,
  };
}
