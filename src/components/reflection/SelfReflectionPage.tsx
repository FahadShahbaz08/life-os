'use client';

import { useMemo, useState } from 'react';
import {
  Plus, Edit2, Trash2, Settings2, Check, ChevronUp, ChevronDown, Sparkles,
  ChevronLeft, ChevronRight, RotateCcw, Flame,
} from 'lucide-react';
import { ReflectionField, ReflectionFieldType, ReflectionFieldValue } from '@/types';
import { useApp } from '@/context/AppContext';
import { useToastContext } from '@/context/ToastContext';
import PageHeader from '@/components/ui/PageHeader';
import Modal, { ModalBody, ModalFooter } from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import EmptyState from '@/components/ui/EmptyState';
import { FORM_INPUT, FORM_SELECT, BTN_PRIMARY, BTN_SECONDARY, BTN_TAB_ACTIVE, BTN_TAB_IDLE } from '@/lib/constants';
import { todayISO } from '@/lib/utils';

const FIELD_TYPES: { value: ReflectionFieldType; label: string; hint: string }[] = [
  { value: 'checkbox', label: 'Checkbox', hint: 'Done / not done' },
  { value: 'number', label: 'Number', hint: 'e.g. pages, minutes' },
  { value: 'text', label: 'Short text', hint: 'One-line answer' },
  { value: 'textarea', label: 'Long text', hint: 'Multi-line reflection' },
];

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function isFieldComplete(field: ReflectionField, value: ReflectionFieldValue | undefined): boolean {
  if (value === undefined || value === null) return false;
  if (field.type === 'checkbox') return value === true;
  if (field.type === 'number') {
    if (typeof value !== 'number' || Number.isNaN(value)) return false;
    if (field.target != null && field.target > 0) return value >= field.target;
    return value > 0;
  }
  if (typeof value === 'string') return value.trim().length > 0;
  return false;
}

function dayIsComplete(
  fields: ReflectionField[],
  values: Record<string, ReflectionFieldValue>,
): boolean {
  if (fields.length === 0) return false;
  return fields.every(f => isFieldComplete(f, values[f.id]));
}

/** Consecutive completed days ending on `endDate` (or yesterday if endDate incomplete). */
function computeReflectionStreak(
  fields: ReflectionField[],
  entries: { date: string; values: Record<string, ReflectionFieldValue> }[],
  endDate: string,
): number {
  if (fields.length === 0) return 0;
  const byDate = new Map(entries.map(e => [e.date, e.values]));
  let cursor = endDate;
  // If selected/today is incomplete, start counting from yesterday
  if (!dayIsComplete(fields, byDate.get(cursor) ?? {})) {
    cursor = shiftDate(cursor, -1);
  }
  let streak = 0;
  while (dayIsComplete(fields, byDate.get(cursor) ?? {})) {
    streak += 1;
    cursor = shiftDate(cursor, -1);
  }
  return streak;
}

export default function SelfReflectionPage() {
  const {
    state,
    addReflectionField,
    updateReflectionField,
    deleteReflectionField,
    reorderReflectionFields,
    setReflectionValue,
    setReflectionNote,
  } = useApp();
  const { toast } = useToastContext();
  const today = todayISO();
  const [date, setDate] = useState(today);
  const [customizing, setCustomizing] = useState(false);
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [editing, setEditing] = useState<ReflectionField | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fields = useMemo(
    () => [...(state.reflectionFields ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [state.reflectionFields],
  );

  const entry = useMemo(
    () => (state.reflectionEntries ?? []).find(e => e.date === date),
    [state.reflectionEntries, date],
  );
  const values = entry?.values ?? {};
  const dayNote = entry?.note ?? '';

  const completedCount = fields.filter(f => isFieldComplete(f, values[f.id])).length;
  const progress = fields.length ? Math.round((completedCount / fields.length) * 100) : 0;
  const isToday = date === today;
  const streak = useMemo(
    () => computeReflectionStreak(fields, state.reflectionEntries ?? [], today),
    [fields, state.reflectionEntries, today],
  );

  const moveField = (id: string, dir: -1 | 1) => {
    const ids = fields.map(f => f.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorderReflectionFields(ids);
  };

  return (
    <>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-8">
        <PageHeader
          title="Self Reflection"
          subtitle="Same checklist every day — answers reset each morning, history is kept"
          action={
            <button type="button" onClick={() => { setEditing(null); setShowFieldForm(true); }} className={BTN_PRIMARY}>
              <Plus size={14} />
              Add item
            </button>
          }
        />

        <div className="card p-3 mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setDate(d => shiftDate(d, -1))}
              className="p-2 rounded-lg border border-base text-muted hover:text-primary hover:bg-raised"
              aria-label="Previous day"
            >
              <ChevronLeft size={16} />
            </button>
            <input
              type="date"
              value={date}
              max={today}
              onChange={e => setDate(e.target.value || today)}
              className="px-3 py-1.5 text-sm bg-raised border border-base rounded-lg text-primary"
            />
            <button
              type="button"
              disabled={date >= today}
              onClick={() => setDate(d => {
                const next = shiftDate(d, 1);
                return next > today ? today : next;
              })}
              className="p-2 rounded-lg border border-base text-muted hover:text-primary hover:bg-raised disabled:opacity-30"
              aria-label="Next day"
            >
              <ChevronRight size={16} />
            </button>
            {!isToday && (
              <button
                type="button"
                onClick={() => setDate(today)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-base text-secondary hover:bg-raised"
              >
                <RotateCcw size={12} />
                Today
              </button>
            )}
            {isToday && (
              <span className="text-[11px] font-medium px-2 py-1 rounded-md bg-accent-subtle text-primary border border-base">
                Today · daily
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {streak > 0 && (
              <div className="flex items-center gap-1 text-amber-400" title="Days in a row you finished every item">
                <Flame size={14} />
                <span className="text-sm font-bold tabular-nums">{streak}</span>
                <span className="text-[11px] text-muted">day streak</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => setCustomizing(c => !c)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border ${
                customizing ? BTN_TAB_ACTIVE : BTN_TAB_IDLE
              }`}
            >
              <Settings2 size={13} />
              Customize template
            </button>
          </div>
        </div>

        <p className="text-xs text-muted mb-4">
          Your items stay the same every day. Checking off “Five prayers” or logging pages applies to <strong className="text-secondary font-medium">{isToday ? 'today only' : date}</strong>
          {' '}— tomorrow starts fresh.
        </p>

        {fields.length > 0 && (
          <div className="card p-4 mb-5">
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-xs text-muted">
                {completedCount} of {fields.length} done
                {isToday ? ' today' : ` · ${date}`}
              </p>
              <p className="text-xs font-semibold tabular-nums text-primary">{progress}%</p>
            </div>
            <div className="h-1.5 rounded-full bg-raised overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {fields.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="Build your daily checklist"
            description="Add things like “Five prayers”, “10 pages of books”, or anything you want to repeat every day. Edit once under Customize — it shows up again tomorrow."
            action={
              <button type="button" onClick={() => setShowFieldForm(true)} className={BTN_PRIMARY}>
                Add first item
              </button>
            }
          />
        ) : (
          <div className="space-y-2">
            {fields.map((field, index) => (
              <ReflectionFieldRow
                key={field.id}
                field={field}
                value={values[field.id]}
                customizing={customizing}
                isFirst={index === 0}
                isLast={index === fields.length - 1}
                onChange={v => setReflectionValue(date, field.id, v)}
                onEdit={() => { setEditing(field); setShowFieldForm(true); }}
                onDelete={() => setDeletingId(field.id)}
                onMoveUp={() => moveField(field.id, -1)}
                onMoveDown={() => moveField(field.id, 1)}
              />
            ))}
          </div>
        )}

        {fields.length > 0 && (
          <div className="card p-4 mt-5">
            <label className="block text-xs font-medium text-muted mb-2">Day note (optional)</label>
            <textarea
              value={dayNote}
              onChange={e => setReflectionNote(date, e.target.value)}
              rows={3}
              placeholder="How did this day feel overall?"
              className={FORM_INPUT + ' resize-y min-h-[72px]'}
            />
          </div>
        )}
      </div>

      {showFieldForm && (
        <FieldFormModal
          field={editing}
          onClose={() => { setShowFieldForm(false); setEditing(null); }}
          onSave={data => {
            if (editing) {
              updateReflectionField(editing.id, data);
              toast('Template item updated — applies every day');
            } else {
              addReflectionField(data);
              toast('Added — will repeat daily');
            }
            setShowFieldForm(false);
            setEditing(null);
          }}
        />
      )}

      {deletingId && (
        <ConfirmDialog
          title="Remove from daily list?"
          message="This removes the item from your template for every day going forward. Past answers for this field are cleared."
          confirmLabel="Remove"
          onConfirm={() => {
            deleteReflectionField(deletingId);
            setDeletingId(null);
            toast('Removed from daily template', 'info');
          }}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </>
  );
}

function ReflectionFieldRow({
  field,
  value,
  customizing,
  isFirst,
  isLast,
  onChange,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  field: ReflectionField;
  value: ReflectionFieldValue | undefined;
  customizing: boolean;
  isFirst: boolean;
  isLast: boolean;
  onChange: (v: ReflectionFieldValue) => void;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const done = isFieldComplete(field, value);
  const subtitle =
    field.type === 'checkbox' ? 'Daily checkbox'
      : field.type === 'number'
        ? [
            field.target != null ? `Target ${field.target}` : null,
            field.unit || null,
            'resets daily',
          ].filter(Boolean).join(' · ')
        : field.type === 'textarea' ? 'Long text · daily' : 'Text · daily';

  return (
    <div className={`card p-4 ${done ? 'border-[var(--chart-pos)]/25' : ''}`}>
      <div className="flex items-start gap-3">
        {field.type === 'checkbox' ? (
          <button
            type="button"
            onClick={() => onChange(!(value === true))}
            className={`mt-0.5 w-9 h-9 rounded-xl border-2 flex items-center justify-center shrink-0 transition-colors ${
              value === true
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                : 'border-base text-muted hover:border-[var(--accent)]'
            }`}
            aria-label={field.label}
          >
            {value === true ? <Check size={16} /> : null}
          </button>
        ) : null}

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-primary">{field.label}</p>
              <p className="text-[11px] text-muted">{subtitle}</p>
            </div>
            {customizing && (
              <div className="flex items-center gap-0.5 shrink-0">
                <button type="button" disabled={isFirst} onClick={onMoveUp} className="p-1.5 text-muted hover:text-primary disabled:opacity-30 rounded-lg">
                  <ChevronUp size={14} />
                </button>
                <button type="button" disabled={isLast} onClick={onMoveDown} className="p-1.5 text-muted hover:text-primary disabled:opacity-30 rounded-lg">
                  <ChevronDown size={14} />
                </button>
                <button type="button" onClick={onEdit} className="p-1.5 text-muted hover:text-primary rounded-lg">
                  <Edit2 size={13} />
                </button>
                <button type="button" onClick={onDelete} className="p-1.5 text-muted hover:text-red-400 rounded-lg">
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>

          {field.type === 'text' && (
            <input
              type="text"
              value={typeof value === 'string' ? value : value != null ? String(value) : ''}
              onChange={e => onChange(e.target.value)}
              placeholder={field.placeholder || 'Write here…'}
              className={FORM_INPUT}
            />
          )}
          {field.type === 'number' && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={typeof value === 'number' ? value : value == null ? '' : Number(value)}
                onChange={e => {
                  const raw = e.target.value;
                  onChange(raw === '' ? 0 : Number(raw));
                }}
                min={0}
                step="any"
                placeholder={field.placeholder || (field.target != null ? `0 / ${field.target}` : '0')}
                className={FORM_INPUT}
              />
              {field.unit ? <span className="text-xs text-muted shrink-0">{field.unit}</span> : null}
              {field.target != null && typeof value === 'number' && value > 0 && (
                <span className={`text-[11px] tabular-nums shrink-0 ${done ? 'text-emerald-400' : 'text-muted'}`}>
                  {value}/{field.target}
                </span>
              )}
            </div>
          )}
          {field.type === 'textarea' && (
            <textarea
              value={typeof value === 'string' ? value : value != null ? String(value) : ''}
              onChange={e => onChange(e.target.value)}
              rows={3}
              placeholder={field.placeholder || 'Write freely…'}
              className={FORM_INPUT + ' resize-y min-h-[72px]'}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function FieldFormModal({
  field,
  onSave,
  onClose,
}: {
  field: ReflectionField | null;
  onSave: (d: Omit<ReflectionField, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder'>) => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(field?.label ?? '');
  const [type, setType] = useState<ReflectionFieldType>(field?.type ?? 'checkbox');
  const [unit, setUnit] = useState(field?.unit ?? '');
  const [target, setTarget] = useState(field?.target != null ? String(field.target) : '');
  const [placeholder, setPlaceholder] = useState(field?.placeholder ?? '');

  return (
    <Modal title={field ? 'Edit daily item' : 'New daily item'} onClose={onClose}>
      <form
        onSubmit={e => {
          e.preventDefault();
          if (!label.trim()) return;
          onSave({
            label: label.trim(),
            type,
            unit: unit.trim(),
            target: type === 'number' && target.trim() !== '' ? Number(target) : null,
            placeholder: placeholder.trim(),
          });
        }}
        className="flex flex-col flex-1 overflow-hidden"
      >
        <ModalBody>
          <div className="space-y-4">
            <p className="text-xs text-muted">
              This item repeats every day. You fill it in fresh each morning.
            </p>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Label</label>
              <input
                autoFocus
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="e.g. Five prayers, 10 pages of books"
                className={FORM_INPUT}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Field type</label>
              <select value={type} onChange={e => setType(e.target.value as ReflectionFieldType)} className={FORM_SELECT}>
                {FIELD_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label} — {t.hint}</option>
                ))}
              </select>
            </div>
            {type === 'number' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">Target (optional)</label>
                  <input
                    type="number"
                    min={0}
                    value={target}
                    onChange={e => setTarget(e.target.value)}
                    placeholder="10"
                    className={FORM_INPUT}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">Unit (optional)</label>
                  <input
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    placeholder="pages, rakats…"
                    className={FORM_INPUT}
                  />
                </div>
              </div>
            )}
            {(type === 'text' || type === 'textarea' || type === 'number') && (
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">Placeholder (optional)</label>
                <input
                  value={placeholder}
                  onChange={e => setPlaceholder(e.target.value)}
                  placeholder={type === 'number' ? 'How many today?' : 'Hint text…'}
                  className={FORM_INPUT}
                />
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={onClose} className={BTN_SECONDARY}>Cancel</button>
          <button type="submit" className={BTN_PRIMARY} disabled={!label.trim()}>
            {field ? 'Save' : 'Add daily item'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
