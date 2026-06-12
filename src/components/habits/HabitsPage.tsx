'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, Repeat, Flame } from 'lucide-react';
import { Habit, HabitFrequency } from '@/types';
import { useApp } from '@/context/AppContext';
import { useToastContext } from '@/context/ToastContext';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Modal, { ModalBody, ModalFooter } from '@/components/ui/Modal';
import { FORM_INPUT, FORM_SELECT, BTN_PRIMARY } from '@/lib/constants';
import { computeHabitStreak, computeHabitCompletionRate, todayISO } from '@/lib/utils';

export default function HabitsPage() {
  const { state, addHabit, updateHabit, deleteHabit, toggleHabitCompletion } = useApp();
  const { toast } = useToastContext();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const today = todayISO();

  const habits = state.habits.filter(h => h.isActive);

  return (
    <>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-8">
        <PageHeader title="Habits" subtitle="Daily rituals that compound over time"
          action={<button onClick={() => setShowForm(true)} className={BTN_PRIMARY}><Plus size={14} />Add Habit</button>}
        />

        {habits.length === 0 ? (
          <EmptyState icon={Repeat} title="No habits yet" description="Track gym, reading, meditation, trade study — build streaks."
            action={<button onClick={() => setShowForm(true)} className={BTN_PRIMARY}>Add first habit</button>}
          />
        ) : (
          <div className="space-y-3">
            {habits.map(habit => {
              const completed = state.habitCompletions.some(c => c.habitId === habit.id && c.completedAt.startsWith(today));
              const streak = computeHabitStreak(habit.id, state.habitCompletions);
              const rate = computeHabitCompletionRate(habit.id, state.habitCompletions);
              return (
                <div key={habit.id} className={`bg-surface border rounded-2xl p-5 ${completed ? 'border-emerald-500/30' : 'border-base'}`}>
                  <div className="flex items-center gap-4">
                    <button onClick={() => { toggleHabitCompletion(habit.id); toast(completed ? 'Unchecked' : 'Habit logged!'); }}
                      className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center shrink-0 transition-colors ${completed ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' : 'border-base text-muted hover:border-indigo-500'}`}>
                      {completed ? '✓' : ''}
                    </button>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-primary">{habit.name}</h3>
                      <p className="text-xs text-muted">{habit.frequency}{habit.targetCount ? ` · ${habit.targetCount} ${habit.unit}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-amber-400"><Flame size={12} /><span className="text-sm font-bold">{streak}</span></div>
                        <p className="text-[10px] text-muted">streak</p>
                      </div>
                      <div className="text-center">
                        <span className="text-sm font-bold text-primary">{rate}%</span>
                        <p className="text-[10px] text-muted">30d rate</p>
                      </div>
                      <button onClick={() => setEditing(habit)} className="p-1.5 text-muted hover:text-indigo-400 rounded-lg"><Edit2 size={13} /></button>
                      <button onClick={() => setDeletingId(habit.id)} className="p-1.5 text-muted hover:text-red-400 rounded-lg"><Trash2 size={13} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {(showForm || editing) && (
        <HabitForm habit={editing} onSave={d => {
          if (editing) { updateHabit(editing.id, d); toast('Habit updated'); }
          else { addHabit(d); toast('Habit created'); }
          setShowForm(false); setEditing(null);
        }} onClose={() => { setShowForm(false); setEditing(null); }} />
      )}
      {deletingId && <ConfirmDialog title="Delete habit?" message="All completion history will be lost." onConfirm={() => { deleteHabit(deletingId); setDeletingId(null); }} onCancel={() => setDeletingId(null)} />}
    </>
  );
}

function HabitForm({ habit, onSave, onClose }: { habit: Habit | null; onSave: (d: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>) => void; onClose: () => void }) {
  const { state } = useApp();
  const [name, setName] = useState(habit?.name ?? '');
  const [description, setDescription] = useState(habit?.description ?? '');
  const [frequency, setFrequency] = useState<HabitFrequency>(habit?.frequency ?? 'daily');
  const [targetCount, setTargetCount] = useState(habit?.targetCount?.toString() ?? '1');
  const [unit, setUnit] = useState(habit?.unit ?? 'session');
  const [areaId, setAreaId] = useState(habit?.areaId ?? '');

  return (
    <Modal title={habit ? 'Edit Habit' : 'New Habit'} onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); if (!name.trim()) return;
        onSave({ name: name.trim(), description, frequency, scheduleDays: habit?.scheduleDays ?? [1,2,3,4,5,6,0],
          targetCount: Number(targetCount) || 1, unit, areaId: areaId || null, isActive: true });
      }} className="flex flex-col flex-1 overflow-hidden">
        <ModalBody>
          <div className="space-y-3">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Habit name *" className={FORM_INPUT} required />
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" rows={2} className={`${FORM_INPUT} resize-none`} />
            <select value={frequency} onChange={e => setFrequency(e.target.value as HabitFrequency)} className={FORM_SELECT}>
              <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input type="number" value={targetCount} onChange={e => setTargetCount(e.target.value)} placeholder="Target count" className={FORM_INPUT} />
              <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="Unit (min, reps)" className={FORM_INPUT} />
            </div>
            <select value={areaId} onChange={e => setAreaId(e.target.value)} className={FORM_SELECT}>
              <option value="">No area</option>
              {state.areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={onClose} className="flex-1 py-2 text-sm text-secondary bg-raised border border-base rounded-xl">Cancel</button>
          <button type="submit" className="flex-1 py-2 text-sm text-white bg-indigo-600 rounded-xl">Save</button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
