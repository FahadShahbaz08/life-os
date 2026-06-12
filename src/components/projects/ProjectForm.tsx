'use client';

import { useState } from 'react';
import { Project, Priority, ProjectStatus } from '@/types';
import { PRIORITY_LABELS, PROJECT_STATUS_LABELS, todayISO } from '@/lib/utils';
import { FORM_INPUT, FORM_SELECT } from '@/lib/constants';
import Modal, { ModalBody, ModalFooter } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';

interface Props {
  project?: Project | null;
  defaultAreaId?: string;
  onSave: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}

const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent'];
const STATUSES: ProjectStatus[] = ['not_started', 'in_progress', 'waiting', 'completed', 'archived'];

export default function ProjectForm({ project, defaultAreaId, onSave, onClose }: Props) {
  const { state } = useApp();
  const [name, setName] = useState(project?.name ?? '');
  const [areaId, setAreaId] = useState(project?.areaId ?? defaultAreaId ?? state.areas[0]?.id ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [priority, setPriority] = useState<Priority>(project?.priority ?? 'medium');
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'not_started');
  const [deadline, setDeadline] = useState(project?.deadline ?? '');
  const [notes, setNotes] = useState(project?.notes ?? '');
  const [progressPercent, setProgressPercent] = useState(project?.progressPercent ?? 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !areaId) return;
    onSave({
      areaId, name: name.trim(), description: description.trim(), priority, status,
      deadline: deadline || null, notes: notes.trim(), progressPercent,
      linkedGoalIds: project?.linkedGoalIds ?? [],
    });
  };

  return (
    <Modal title={project ? 'Edit Project' : 'New Project'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
        <ModalBody>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Project Name *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className={FORM_INPUT} autoFocus required />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Area *</label>
              <select value={areaId} onChange={e => setAreaId(e.target.value)} className={FORM_SELECT} required>
                {state.areas.filter(a => !a.isArchived).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className={`${FORM_INPUT} resize-none`} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">Priority</label>
                <select value={priority} onChange={e => setPriority(e.target.value as Priority)} className={FORM_SELECT}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value as ProjectStatus)} className={FORM_SELECT}>
                  {STATUSES.map(s => <option key={s} value={s}>{PROJECT_STATUS_LABELS[s]}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Deadline</label>
              <input type="date" value={deadline} min={todayISO()} onChange={e => setDeadline(e.target.value)} className={FORM_INPUT} />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Progress % (manual override)</label>
              <input type="number" min={0} max={100} value={progressPercent} onChange={e => setProgressPercent(Number(e.target.value))} className={FORM_INPUT} />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={`${FORM_INPUT} resize-none`} />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-secondary bg-raised border border-base rounded-xl">Cancel</button>
          <button type="submit" disabled={!name.trim()} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl disabled:opacity-40">
            {project ? 'Save' : 'Create Project'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
