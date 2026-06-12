import { LucideIcon } from 'lucide-react';

interface Props { icon: LucideIcon; title: string; description?: string; action?: React.ReactNode; }

export default function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-14 h-14 bg-raised rounded-2xl flex items-center justify-center mb-4 border border-base">
        <Icon size={22} className="text-muted" />
      </div>
      <h3 className="text-sm font-semibold text-primary mb-1">{title}</h3>
      {description && <p className="text-sm text-muted max-w-xs leading-relaxed">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
