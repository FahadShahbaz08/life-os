'use client';
import { AlertTriangle, X } from 'lucide-react';

interface Props {
  title: string; message: string; confirmLabel?: string;
  onConfirm: () => void; onCancel: () => void;
}

export default function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-surface border border-base rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <button onClick={onCancel} className="absolute top-4 right-4 text-muted hover:text-secondary"><X size={16} /></button>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
            <AlertTriangle size={17} className="text-red-400" />
          </div>
          <div>
            <h3 className="font-semibold text-primary mb-1">{title}</h3>
            <p className="text-sm text-secondary leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onCancel} className="flex-1 px-4 py-2 text-sm font-medium text-secondary bg-raised hover:bg-base rounded-xl transition-colors border border-base">Cancel</button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
