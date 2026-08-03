'use client';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'success' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}: Props) {
  const isSuccess = variant === 'success';
  const isDanger = variant === 'danger';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-overlay-backdrop backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-surface border border-base rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 animate-in">
        <button onClick={onCancel} className="absolute top-4 right-4 text-muted hover:text-secondary"><X size={16} /></button>
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            isSuccess ? 'bg-emerald-500/10' : isDanger ? 'bg-red-500/10' : 'bg-accent-subtle'
          }`}>
            {isSuccess
              ? <CheckCircle2 size={17} className="text-emerald-400" />
              : <AlertTriangle size={17} className={isDanger ? 'text-red-400' : 'text-accent'} />
            }
          </div>
          <div>
            <h3 className="font-display font-semibold text-primary mb-1">{title}</h3>
            <p className="text-sm text-secondary leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onCancel} className="flex-1 px-4 py-2 text-sm font-medium text-secondary bg-raised hover:bg-base rounded-xl transition-colors border border-base">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-xl transition-colors ${
              isSuccess
                ? 'bg-emerald-600 hover:bg-emerald-500'
                : isDanger
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
