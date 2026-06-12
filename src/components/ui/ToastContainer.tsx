'use client';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { Toast } from '@/hooks/useToast';

interface Props { toasts: Toast[]; onRemove: (id: string) => void; }

const ICONS = {
  success: <CheckCircle size={15} className="text-emerald-500 shrink-0 mt-0.5" />,
  error:   <XCircle    size={15} className="text-red-500    shrink-0 mt-0.5" />,
  info:    <Info       size={15} className="text-blue-400   shrink-0 mt-0.5" />,
};
const BG = { success: 'border-emerald-500/20', error: 'border-red-500/20', info: 'border-blue-500/20' };

export default function ToastContainer({ toasts, onRemove }: Props) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 z-50 flex flex-col gap-2 w-72">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-start gap-3 px-4 py-3 rounded-xl border bg-surface shadow-xl ${BG[t.type]} animate-in`}>
          {ICONS[t.type]}
          <p className="text-sm text-primary flex-1 leading-snug">{t.message}</p>
          <button onClick={() => onRemove(t.id)} className="text-muted hover:text-secondary shrink-0"><X size={13} /></button>
        </div>
      ))}
    </div>
  );
}
