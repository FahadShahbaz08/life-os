'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, Flag, Minus } from 'lucide-react';
import { Goal, GoalHorizon, GoalStatus } from '@/types';
import { useApp } from '@/context/AppContext';
import { useToastContext } from '@/context/ToastContext';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ProgressBar from '@/components/ui/ProgressBar';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Modal, { ModalBody, ModalFooter } from '@/components/ui/Modal';
import { FORM_INPUT, FORM_SELECT, BTN_PRIMARY } from '@/lib/constants';
import { goalProgressPercent, formatDate } from '@/lib/utils';

const HORIZONS: { value: GoalHorizon; label: string }[] = [
  { value: 'short_term', label: 'Short-term' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
  { value: 'long_term', label: 'Long-term' },
];

const QUICK_ADD = [100, 500, 1000, 5000];

export default function GoalsPage() {
  const { state, addGoal, updateGoal, deleteGoal } = useApp();
  const { toast } = useToastContext();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const active = state.goals.filter(g => g.status === 'active');
  const other = state.goals.filter(g => g.status !== 'active');

  return (
    <>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-8">
        <PageHeader title="Goals" subtitle={`${active.length} active goals`}
          action={<button onClick={() => setShowForm(true)} className={BTN_PRIMARY}><Plus size={14} />Add Goal</button>}
        />

        {state.goals.length === 0 ? (
          <EmptyState icon={Flag} title="No goals yet" description="Set measurable goals — save 50,000, lose 10kg, ship a project."
            action={<button onClick={() => setShowForm(true)} className={BTN_PRIMARY}>Set first goal</button>}
          />
        ) : (
          <div className="space-y-6">
            {active.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Active</h2>
                <div className="space-y-3">
                  {active.map(goal => (
                    <GoalCard key={goal.id} goal={goal} onEdit={() => setEditing(goal)} onDelete={() => setDeletingId(goal.id)}
                      onProgress={v => {
                        updateGoal(goal.id, { currentValue: v });
                        toast('Progress updated');
                      }}
                    />
                  ))}
                </div>
              </section>
            )}
            {other.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Other</h2>
                <div className="space-y-3 opacity-70">
                  {other.map(goal => (
                    <GoalCard key={goal.id} goal={goal} onEdit={() => setEditing(goal)} onDelete={() => setDeletingId(goal.id)} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {(showForm || editing) && (
        <GoalForm goal={editing} onSave={d => {
          if (editing) { updateGoal(editing.id, d); toast('Goal updated'); }
          else { addGoal(d); toast('Goal created'); }
          setShowForm(false); setEditing(null);
        }} onClose={() => { setShowForm(false); setEditing(null); }} />
      )}
      {deletingId && <ConfirmDialog title="Delete goal?" message="This cannot be undone." onConfirm={() => { deleteGoal(deletingId); setDeletingId(null); toast('Deleted', 'info'); }} onCancel={() => setDeletingId(null)} />}
    </>
  );
}

function GoalCard({ goal, onEdit, onDelete, onProgress }: {
  goal: Goal;
  onEdit: () => void;
  onDelete: () => void;
  onProgress?: (v: number) => void;
}) {
  const pct = goalProgressPercent(goal);
  const horizon = HORIZONS.find(h => h.value === goal.horizon)?.label;
  const [delta, setDelta] = useState('');
  const [setExact, setSetExact] = useState('');
  const [mode, setMode] = useState<'add' | 'set'>('add');

  const applyAdd = () => {
    if (!onProgress) return;
    const n = Number(delta);
    if (!Number.isFinite(n) || n === 0) return;
    const next = Math.max(0, goal.currentValue + n);
    onProgress(goal.targetValue != null ? Math.min(next, goal.targetValue * 2) : next);
    setDelta('');
  };

  const applySet = () => {
    if (!onProgress) return;
    const n = Number(setExact);
    if (!Number.isFinite(n) || n < 0) return;
    onProgress(n);
    setSetExact('');
  };

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-primary">{goal.title}</h3>
          <p className="text-xs text-muted mt-0.5">{horizon}{goal.targetDate ? ` · ${formatDate(goal.targetDate)}` : ''}</p>
        </div>
        <div className="flex gap-1">
          <button onClick={onEdit} className="p-1.5 text-muted hover:text-primary rounded-lg"><Edit2 size={13} /></button>
          <button onClick={onDelete} className="p-1.5 text-muted hover:text-red-400 rounded-lg"><Trash2 size={13} /></button>
        </div>
      </div>
      {goal.description && <p className="text-xs text-secondary mb-3">{goal.description}</p>}
      {goal.targetValue != null && goal.targetValue > 0 && (
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-muted tabular-nums">
              {goal.currentValue.toLocaleString()} / {goal.targetValue.toLocaleString()} {goal.unit}
            </span>
            <span className="text-secondary tabular-nums">{pct}%</span>
          </div>
          <ProgressBar value={pct} size="sm" />

          {onProgress && (
            <div className="mt-3 space-y-2">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setMode('add')}
                  className={`px-2.5 py-1 text-[11px] rounded-md border ${mode === 'add' ? 'bg-raised border-base text-primary' : 'border-transparent text-muted'}`}
                >
                  Add / subtract
                </button>
                <button
                  type="button"
                  onClick={() => setMode('set')}
                  className={`px-2.5 py-1 text-[11px] rounded-md border ${mode === 'set' ? 'bg-raised border-base text-primary' : 'border-transparent text-muted'}`}
                >
                  Set exact
                </button>
              </div>

              {mode === 'add' ? (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_ADD.map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => onProgress(goal.currentValue + n)}
                        className="px-2 py-1 text-[11px] bg-raised border border-base rounded-md text-secondary hover:text-primary"
                      >
                        +{n.toLocaleString()}
                      </button>
                    ))}
                    {QUICK_ADD.map(n => (
                      <button
                        key={`m${n}`}
                        type="button"
                        onClick={() => onProgress(Math.max(0, goal.currentValue - n))}
                        className="px-2 py-1 text-[11px] bg-raised border border-base rounded-md text-muted hover:text-primary"
                      >
                        −{n.toLocaleString()}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={delta}
                      onChange={e => setDelta(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyAdd(); } }}
                      placeholder={`Custom amount (${goal.unit || 'units'})`}
                      className={`${FORM_INPUT} flex-1`}
                    />
                    <button type="button" onClick={applyAdd} className="px-3 py-2 text-xs font-medium bg-raised border border-base rounded-lg text-primary hover:bg-overlay inline-flex items-center gap-1">
                      <Plus size={12} /> Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const n = Number(delta);
                        if (!Number.isFinite(n) || n === 0) return;
                        onProgress(Math.max(0, goal.currentValue - Math.abs(n)));
                        setDelta('');
                      }}
                      className="px-3 py-2 text-xs font-medium bg-raised border border-base rounded-lg text-secondary hover:bg-overlay inline-flex items-center gap-1"
                    >
                      <Minus size={12} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={setExact}
                    onChange={e => setSetExact(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applySet(); } }}
                    placeholder={`Set total progress (now ${goal.currentValue})`}
                    className={`${FORM_INPUT} flex-1`}
                  />
                  <button type="button" onClick={applySet} className={BTN_PRIMARY}>
                    Set
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GoalForm({ goal, onSave, onClose }: { goal: Goal | null; onSave: (d: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => void; onClose: () => void }) {
  const { state } = useApp();
  const [title, setTitle] = useState(goal?.title ?? '');
  const [description, setDescription] = useState(goal?.description ?? '');
  const [horizon, setHorizon] = useState<GoalHorizon>(goal?.horizon ?? 'short_term');
  const [status, setStatus] = useState<GoalStatus>(goal?.status ?? 'active');
  const [category, setCategory] = useState(goal?.category ?? '');
  const [targetValue, setTargetValue] = useState(goal?.targetValue?.toString() ?? '');
  const [currentValue, setCurrentValue] = useState(goal?.currentValue?.toString() ?? '0');
  const [unit, setUnit] = useState(goal?.unit ?? '');
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? '');
  const [areaId, setAreaId] = useState(goal?.areaId ?? '');

  return (
    <Modal title={goal ? 'Edit Goal' : 'New Goal'} onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); if (!title.trim()) return;
        onSave({ title: title.trim(), description, horizon, status, category, areaId: areaId || null,
          targetValue: targetValue ? Number(targetValue) : null, currentValue: Number(currentValue) || 0,
          unit, targetDate: targetDate || null, linkedProjectIds: goal?.linkedProjectIds ?? [], linkedHabitIds: goal?.linkedHabitIds ?? [],
        });
      }} className="flex flex-col flex-1 overflow-hidden">
        <ModalBody>
          <div className="space-y-3">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Goal title *" className={FORM_INPUT} required />
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" rows={2} className={`${FORM_INPUT} resize-none`} />
            <div className="grid grid-cols-2 gap-3">
              <select value={horizon} onChange={e => setHorizon(e.target.value as GoalHorizon)} className={FORM_SELECT}>
                {HORIZONS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
              </select>
              <select value={status} onChange={e => setStatus(e.target.value as GoalStatus)} className={FORM_SELECT}>
                <option value="active">Active</option><option value="paused">Paused</option>
                <option value="completed">Completed</option><option value="abandoned">Abandoned</option>
              </select>
            </div>
            <select value={areaId} onChange={e => setAreaId(e.target.value)} className={FORM_SELECT}>
              <option value="">No area</option>
              {state.areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <div className="grid grid-cols-3 gap-2">
              <input type="number" value={currentValue} onChange={e => setCurrentValue(e.target.value)} placeholder="Current" className={FORM_INPUT} />
              <input type="number" value={targetValue} onChange={e => setTargetValue(e.target.value)} placeholder="Target" className={FORM_INPUT} />
              <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="Unit (PKR, kg)" className={FORM_INPUT} />
            </div>
            <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className={FORM_INPUT} />
          </div>
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={onClose} className="flex-1 py-2 text-sm text-secondary bg-raised border border-base rounded-lg">Cancel</button>
          <button type="submit" className={`flex-1 py-2 text-sm ${BTN_PRIMARY}`}>Save</button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
