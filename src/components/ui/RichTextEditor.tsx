'use client';

import { useEffect, useRef, useCallback } from 'react';
import {
  Bold, Italic, Underline, List, ListOrdered, Link2, Image as ImageIcon, Heading2, Quote, Type,
} from 'lucide-react';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

function exec(cmd: string, value?: string) {
  document.execCommand(cmd, false, value);
}

export default function RichTextEditor({ value, onChange, placeholder = 'Write your note…', minHeight = 200 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef(value);

  useEffect(() => {
    if (!ref.current) return;
    if (value !== lastEmitted.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || '';
    }
  }, [value]);

  const emit = useCallback(() => {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    lastEmitted.current = html;
    onChange(html);
  }, [onChange]);

  const run = (cmd: string, val?: string) => {
    ref.current?.focus();
    exec(cmd, val);
    emit();
  };

  const addLink = () => {
    const url = window.prompt('Enter link URL');
    if (!url) return;
    run('createLink', url);
  };

  const addImage = () => {
    const url = window.prompt('Enter image URL');
    if (!url) return;
    run('insertImage', url);
  };

  const tools: { icon: typeof Bold; label: string; action: () => void }[] = [
    { icon: Bold, label: 'Bold', action: () => run('bold') },
    { icon: Italic, label: 'Italic', action: () => run('italic') },
    { icon: Underline, label: 'Underline', action: () => run('underline') },
    { icon: Heading2, label: 'Heading', action: () => run('formatBlock', 'h2') },
    { icon: Type, label: 'Paragraph', action: () => run('formatBlock', 'p') },
    { icon: List, label: 'Bullet list', action: () => run('insertUnorderedList') },
    { icon: ListOrdered, label: 'Numbered list', action: () => run('insertOrderedList') },
    { icon: Quote, label: 'Quote', action: () => run('formatBlock', 'blockquote') },
    { icon: Link2, label: 'Link', action: addLink },
    { icon: ImageIcon, label: 'Image', action: addImage },
  ];

  return (
    <div className="rounded-xl border border-base bg-raised overflow-hidden">
      <div className="flex flex-wrap gap-0.5 p-1.5 border-b border-base bg-surface">
        {tools.map(({ icon: Icon, label, action }) => (
          <button
            key={label}
            type="button"
            title={label}
            onMouseDown={e => { e.preventDefault(); action(); }}
            className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-raised transition-colors"
          >
            <Icon size={15} />
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        role="textbox"
        aria-multiline
        data-placeholder={placeholder}
        className="rt-editor px-3 py-2.5"
        style={{ minHeight }}
        onInput={emit}
        onBlur={emit}
        suppressContentEditableWarning
      />
    </div>
  );
}
