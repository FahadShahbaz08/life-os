'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, SkipForward, Flame, Zap, Trophy, Star, Coffee, Brain } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToastContext } from '@/context/ToastContext';
import { computePomodoroStats } from '@/lib/storage';
import { FocusSession } from '@/types';

// Timer configs in seconds
const MODES = {
  work:        { label: 'Focus',        seconds: 25 * 60, color: 'indigo', icon: Brain },
  short_break: { label: 'Short Break',  seconds:  5 * 60, color: 'emerald', icon: Coffee },
  long_break:  { label: 'Long Break',   seconds: 15 * 60, color: 'blue', icon: Coffee },
} as const;

type Mode = keyof typeof MODES;

const LEVEL_TITLES = ['Rookie', 'Apprentice', 'Developer', 'Senior Dev', 'Tech Lead', 'Architect', 'CTO', 'Legend'];
const getLevelTitle = (level: number) => LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];

const RING_R  = 88;
const RING_C  = 2 * Math.PI * RING_R;

function pad(n: number) { return String(n).padStart(2, '0'); }

export default function PomodoroPage() {
  const { state, addFocusSession } = useApp();
  const { toast } = useToastContext();

  const [mode, setMode]             = useState<Mode>('work');
  const [remaining, setRemaining]   = useState(MODES.work.seconds);
  const [running, setRunning]       = useState(false);
  const [sessionCount, setSessionCount] = useState(0); // work sessions this sitting
  const [projectId, setProjectId]   = useState<string>('');
  const [label, setLabel]           = useState('');
  const [showLevelUp, setShowLevelUp] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stats = computePomodoroStats(state.focusSessions);
  const prevLevel = useRef(stats.level);

  // Switch mode
  const switchMode = useCallback((m: Mode) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setMode(m);
    setRemaining(MODES[m].seconds);
    setRunning(false);
  }, []);

  // Tick
  useEffect(() => {
    if (!running) { if (intervalRef.current) clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(intervalRef.current!);
          handleComplete();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, mode]);

  const handleComplete = useCallback(() => {
    setRunning(false);
    const session: Omit<FocusSession, 'id'> = {
      completedAt: new Date().toISOString(),
      duration: Math.round(MODES[mode].seconds / 60),
      type: mode,
      projectId: projectId || null,
      taskId: null,
      areaId: null,
      label: label || MODES[mode].label,
    };
    addFocusSession(session);

    if (mode === 'work') {
      const newCount = sessionCount + 1;
      setSessionCount(newCount);
      toast(`🍅 Focus session complete! +25 XP`);
      // Auto-suggest break
      const nextMode: Mode = newCount % 4 === 0 ? 'long_break' : 'short_break';
      setTimeout(() => switchMode(nextMode), 800);
    } else {
      toast(`Break over — time to focus!`);
      setTimeout(() => switchMode('work'), 800);
    }
  }, [mode, sessionCount, projectId, label, addFocusSession, toast, switchMode]);

  // Check for level up
  useEffect(() => {
    if (stats.level > prevLevel.current) {
      setShowLevelUp(true);
      prevLevel.current = stats.level;
      setTimeout(() => setShowLevelUp(false), 3000);
    }
  }, [stats.level]);

  const reset  = () => { if (intervalRef.current) clearInterval(intervalRef.current); setRemaining(MODES[mode].seconds); setRunning(false); };
  const skip   = () => handleComplete();
  const toggle = () => setRunning(r => !r);

  // Ring progress
  const total    = MODES[mode].seconds;
  const progress = remaining / total;
  const offset   = RING_C * (1 - progress);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  const modeColor = {
    indigo:  { ring: '#818cf8', glow: 'shadow-indigo-500/20',  btn: 'bg-indigo-600 hover:bg-indigo-500',   text: 'text-indigo-400' },
    emerald: { ring: '#34d399', glow: 'shadow-emerald-500/20', btn: 'bg-emerald-600 hover:bg-emerald-500', text: 'text-emerald-400' },
    blue:    { ring: '#60a5fa', glow: 'shadow-blue-500/20',    btn: 'bg-blue-600 hover:bg-blue-500',       text: 'text-blue-400' },
  }[MODES[mode].color];

  const xpPercent = Math.round((stats.xp / stats.xpToNextLevel) * 100);

  const todaySessions = state.focusSessions.filter(s =>
    s.type === 'work' && s.completedAt.startsWith(new Date().toISOString().split('T')[0])
  ).length;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-primary">Focus Session</h1>
          <p className="text-sm text-muted mt-0.5">Pomodoro timer · Deep work sprints</p>
        </div>

        {/* Level up banner */}
        {showLevelUp && (
          <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl flex items-center gap-3 animate-in">
            <Trophy size={20} className="text-yellow-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-yellow-400">Level Up! 🎉</p>
              <p className="text-xs text-secondary">You are now <strong>{getLevelTitle(stats.level)}</strong> — Level {stats.level}</p>
            </div>
          </div>
        )}

        {/* Player card */}
        <div className="bg-surface border border-base rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-lg">
                {stats.level <= 2 ? '🌱' : stats.level <= 4 ? '⚡' : stats.level <= 6 ? '🔥' : '👑'}
              </div>
              <div>
                <p className="text-sm font-semibold text-primary">{getLevelTitle(stats.level)}</p>
                <p className="text-xs text-muted">Level {stats.level}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted">{stats.xp} / {stats.xpToNextLevel} XP</p>
              <p className="text-[11px] text-muted">{stats.xpToNextLevel - stats.xp} XP to next level</p>
            </div>
          </div>
          {/* XP bar */}
          <div className="relative h-2.5 bg-raised rounded-full overflow-hidden border border-subtle">
            <div className="h-full bg-gradient-to-r from-indigo-600 to-purple-500 rounded-full transition-all duration-700" style={{ width: `${xpPercent}%` }} />
            <div className="absolute inset-0 overflow-hidden rounded-full">
              <div className="absolute top-0 bottom-0 w-8 bg-gradient-to-r from-transparent via-white/20 to-transparent xp-shine" style={{ left: '-2rem' }} />
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { icon: Zap,    label: 'Total Sessions', value: stats.totalSessions, color: 'text-indigo-400' },
              { icon: Flame,  label: 'Day Streak',      value: `${stats.currentStreak}d`, color: 'text-orange-400' },
              { icon: Star,   label: 'Today',           value: todaySessions, color: 'text-yellow-400' },
            ].map(s => (
              <div key={s.label} className="bg-raised rounded-xl p-3 border border-subtle text-center">
                <s.icon size={14} className={`${s.color} mx-auto mb-1`} />
                <p className="text-base font-bold text-primary tabular-nums">{s.value}</p>
                <p className="text-[10px] text-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mode selector */}
        <div className="flex gap-2 mb-5 p-1 bg-raised rounded-2xl border border-base">
          {(Object.keys(MODES) as Mode[]).map(m => (
            <button key={m} onClick={() => switchMode(m)}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-colors ${
                mode === m ? 'bg-surface text-primary shadow-sm border border-base' : 'text-muted hover:text-secondary'
              }`}>
              {MODES[m].label}
            </button>
          ))}
        </div>

        {/* Timer ring */}
        <div className="flex flex-col items-center mb-5">
          <div className="relative">
            <svg width="220" height="220" className="rotate-[-90deg]">
              {/* Track */}
              <circle cx="110" cy="110" r={RING_R} fill="none" stroke="currentColor" strokeWidth="8" className="text-raised" />
              {/* Progress */}
              <circle
                cx="110" cy="110" r={RING_R}
                fill="none"
                stroke={modeColor.ring}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={RING_C}
                strokeDashoffset={offset}
                className="timer-ring"
                style={{ filter: `drop-shadow(0 0 8px ${modeColor.ring}60)` }}
              />
            </svg>
            {/* Center display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-bold text-primary tabular-nums tracking-tighter">
                {pad(mins)}:{pad(secs)}
              </span>
              <span className={`text-xs font-semibold mt-1 ${modeColor.text}`}>{MODES[mode].label}</span>
              {running && (
                <span className="flex items-center gap-1 text-[10px] text-muted mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Focusing
                </span>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 mt-4">
            <button onClick={reset} className="p-3 text-muted hover:text-secondary hover:bg-raised rounded-2xl border border-base transition-colors" title="Reset">
              <RotateCcw size={18} />
            </button>
            <button onClick={toggle}
              className={`flex items-center justify-center w-16 h-16 rounded-2xl text-white font-bold shadow-xl transition-all active:scale-95 ${modeColor.btn} ${modeColor.glow} shadow-lg`}>
              {running ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
            </button>
            <button onClick={skip} className="p-3 text-muted hover:text-secondary hover:bg-raised rounded-2xl border border-base transition-colors" title="Skip">
              <SkipForward size={18} />
            </button>
          </div>

          {/* Session dots (4-session cycle) */}
          <div className="flex gap-2 mt-5">
            {[0,1,2,3].map(i => (
              <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all ${i < (sessionCount % 4) ? 'bg-indigo-500 scale-110' : 'bg-raised border border-base'}`} />
            ))}
          </div>
          <p className="text-[11px] text-muted mt-1.5">{sessionCount % 4}/4 sessions · Long break after 4</p>
        </div>

        {/* Session settings */}
        <div className="bg-surface border border-base rounded-2xl p-5 mb-5">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Session Settings</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">What are you working on?</label>
              <input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Fixing the auth bug"
                className="w-full px-3 py-2 text-sm bg-raised border border-base rounded-xl text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Project (optional)</label>
              <select value={projectId} onChange={e => setProjectId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-raised border border-base rounded-xl text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">No project</option>
                {state.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Session history */}
        {state.focusSessions.length > 0 && (
          <div className="bg-surface border border-base rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Recent Sessions</h3>
            <div className="space-y-2">
              {state.focusSessions.slice(0, 8).map(s => {
                const isWork = s.type === 'work';
                const proj = s.projectId ? state.projects.find(p => p.id === s.projectId) : null;
                const time = new Date(s.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const day  = new Date(s.completedAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
                return (
                  <div key={s.id} className="flex items-center gap-3 py-2 border-b border-subtle last:border-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isWork ? 'bg-indigo-500/10' : 'bg-emerald-500/10'}`}>
                      {isWork ? <Brain size={13} className="text-indigo-400" /> : <Coffee size={13} className="text-emerald-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-primary truncate">{s.label || MODES[s.type].label}</p>
                      {proj && <p className="text-[10px] text-muted truncate">{proj.name}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-muted">{day} · {time}</p>
                      <p className={`text-[10px] font-medium ${isWork ? 'text-indigo-400' : 'text-emerald-400'}`}>{s.duration}m {isWork ? '+25 XP' : ''}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
    </div>
  );
}
