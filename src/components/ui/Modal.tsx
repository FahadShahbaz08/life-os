'use client';

import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}

export default function Modal({ title, onClose, children, maxWidth = 'max-w-lg' }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-surface border border-base rounded-2xl shadow-2xl w-full ${maxWidth} mx-4 flex flex-col max-h-[90vh]`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-base shrink-0">
          <h2 className="font-semibold text-primary">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-secondary"><X size={17} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ModalBody({ children }: { children: React.ReactNode }) {
  return <div className="overflow-y-auto flex-1 px-5 py-4">{children}</div>;
}

export function ModalFooter({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-3 px-5 py-4 border-t border-base shrink-0">{children}</div>;
}
