'use client';

import { useState } from 'react';
import { Project, Priority, ProjectStatus } from '@/types';
import { PRIORITY_LABELS, PROJECT_STATUS_LABELS, todayISO, normalizeTags } from '@/lib/utils';
import { FORM_INPUT, FORM_SELECT, PROJECT_TAG_SUGGESTIONS } from '@/lib/constants';
import Modal, { ModalBody, ModalFooter } from '@/components/ui/Modal';

interface Props {
  project?: Project | null;
  onSave: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}

const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent'];
const STATUSES: ProjectStatus[] = ['not_started', 'in_progress', 'waiting', 'completed', 'archived'];

export default function ProjectForm({ project, onSave, onClose }: Props) {
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [tags, setTags] = useState((project?.tags ?? []).join(', '));
  const [priority, setPriority] = useState<Priority>(project?.priority ?? 'medium');
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'not_started');
  const [deadline, setDeadline] = useState(project?.deadline ?? '');
  const [notes, setNotes] = useState(project?.notes ?? '');
  const [progressPercent, setProgressPercent] = useState(project?.progressPercent ?? 0);
  const [isPinned, setIsPinned] = useState(project?.isPinned ?? false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const parsedTags = normalizeTags(tags.split(',').map(t => t.trim()).filter(Boolean));
    onSave({
      areaId: null,
      name: name.trim(),
      description: description.trim(),
      priority,
      status,
      deadline: deadline || null,
      notes: notes.trim(),
      progressPercent,
      tags: parsedTags.length ? parsedTags : ['personal'],
      isPinned,
      linkedGoalIds: project?.linkedGoalIds ?? [],
    });
  };

  const addTag = (tag: string) => {
    const current = tags.split(',').map(t => t.trim()).filter(Boolean);
    if (!current.includes(tag)) setTags([...current, tag].join(', '));
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
              <label className="block text-xs font-medium text-secondary mb-1.5">Tags</label>
              <input
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="business, learning, client-work"
                className={FORM_INPUT}
              />
              <div className="flex flex-wrap gap-1 mt-2">
                {PROJECT_TAG_SUGGESTIONS.map(tag => (
                  <button key={tag} type="button" onClick={() => addTag(tag)}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-raised text-muted hover:text-indigo-400 hover:bg-indigo-500/10 capitalize">
                    + {tag.replace(/-/g, ' ')}
                  </button>
                ))}
              </div>
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
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className={FORM_INPUT} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isPinned} onChange={e => setIsPinned(e.target.checked)} className="rounded border-base" />
              <span className="text-sm text-secondary">Pin to top of projects list</span>
            </label>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={`${FORM_INPUT} resize-none`} />
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
