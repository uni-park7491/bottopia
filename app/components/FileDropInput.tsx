'use client';
import { useEffect, useId, useRef, useState } from 'react';

export default function FileDropInput({ label, accept, name, required, disabled, validate, onFile, hint }: {
  label: string; accept: string; name?: string; required?: boolean; disabled?: boolean;
  validate: (file: File) => string | null; onFile?: (file: File) => void; hint: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const [over, setOver] = useState(false);
  const [filename, setFilename] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    const form = input.current?.form;
    const reset = () => { input.current?.setCustomValidity(''); setFilename(''); setError(''); setOver(false); };
    form?.addEventListener('reset', reset);
    return () => form?.removeEventListener('reset', reset);
  }, []);
  function select(files: FileList | null) {
    if (disabled || !files?.length) return;
    const file = files[0];
    const problem = files.length !== 1 ? '파일은 한 번에 하나씩 선택해주세요.' : validate(file);
    setError(problem ?? '');
    input.current?.setCustomValidity(problem ?? '');
    if (problem) {
      if (input.current) input.current.value = '';
      setFilename('');
      return;
    }
    const transfer = new DataTransfer();
    transfer.items.add(file);
    if (input.current) input.current.files = transfer.files;
    setFilename(file.name);
    onFile?.(file);
  }
  return <div className={`file-drop-input${over && !disabled ? ' is-dragging' : ''}`} aria-disabled={disabled || undefined}
    onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = disabled ? 'none' : 'copy'; if (!disabled) setOver(true); }}
    onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false); }}
    onDrop={event => { event.preventDefault(); setOver(false); select(event.dataTransfer.files); }}>
    <label htmlFor={id}>{label}</label>
    <p>파일을 여기에 놓거나 아래에서 선택하세요.</p>
    <input ref={input} id={id} type="file" name={name} accept={accept} required={required} disabled={disabled}
      aria-describedby={`${id}-hint ${id}-status`} aria-invalid={!!error} onChange={event => select(event.target.files)} />
    <p id={`${id}-hint`}>{hint}</p>
    <p id={`${id}-status`} role={error ? 'alert' : 'status'}>{error || filename}</p>
  </div>;
}
