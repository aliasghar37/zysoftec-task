import { useRef, useState, useEffect } from 'react';

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Composer({
  value,
  onChange,
  onSend,
  disabled,
  image,
  imageError,
  onPickImage,
  onImageError,
  onRemoveImage,
  onPreviewImage,
  skills = [],
  onStopGenerating, 
}) {
  const fileRef = useRef(null);
  const textareaRef = useRef(null);
  const [active, setActive] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  // Mirrors the highlighted index so key handlers never read a stale closure.
  const activeRef = useRef(0);
  const moveActive = (i) => {
    activeRef.current = i;
    setActive(i);
  };

  // "/" opens a skill menu above the input. It must not reopen after a pick
  // while the value still starts with "/", so it re-arms only once the value
  // leaves slash-prefix (cleared, or a fresh message).
  const slashMatch = value.startsWith('/')
    ? /^\/([\w-]*)/.exec(value)?.[1] || ''
    : null;
  const matching =
    slashMatch === null
      ? []
      : skills.filter((s) =>
          s.id.toLowerCase().startsWith(slashMatch.toLowerCase()),
        );
  const open = !disabled && !dismissed && matching.length > 0;

  const prevValueRef = useRef(value);
  useEffect(() => {
    const prev = prevValueRef.current;
    prevValueRef.current = value;
    if (!prev.startsWith('/') && value.startsWith('/')) setDismissed(false);
  }, [value]);
  useEffect(() => moveActive(0), [slashMatch, skills]);

  const pickSkill = (skill) => {
    onChange(`/${skill.id} `);
    moveActive(0);
    setDismissed(true);
    textareaRef.current?.focus();
  };

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  const submit = (e) => {
    e.preventDefault();
    if (!disabled && value.trim()) onSend();
  };

  const handleKey = (e) => {
    if (open) {
      if (e.key === 'ArrowDown' || e.key === 'Tab') {
        e.preventDefault();
        moveActive((activeRef.current + 1) % matching.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveActive((activeRef.current - 1 + matching.length) % matching.length);
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        pickSkill(matching[activeRef.current]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setDismissed(true);
        moveActive(0);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit(e);
    }
  };

  // Attach image validation (must be an image no bigger than MAX_IMAGE_BYTES).
  const handleFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onImageError('That file is not an image. Choose a PNG, JPG, GIF or WebP.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      onImageError('That image is too large — the limit is 4 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      onPickImage({
        dataUrl: reader.result,
        name: file.name,
        size: file.size,
        mimeType: file.type,
      });
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-transparent px-4 py-4">
      <div className="mx-auto max-w-3xl">
        {imageError && (
          <p className="mb-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            ⚠ {imageError}
          </p>
        )}

        {image && (
          <div className="mb-2 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2">
            <button
              type="button"
              onClick={() => onPreviewImage(image.dataUrl)}
              aria-label="Preview image"
              className="group shrink-0"
            >
              <img
                src={image.dataUrl}
                alt="Attachment preview"
                className="h-14 w-14 cursor-zoom-in rounded-lg object-cover ring-1 ring-white/10 transition group-hover:ring-blue-400/50"
              />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-slate-200">{image.name}</p>
              <p className="text-xs text-slate-500">
                {formatBytes(image.size)} · click thumbnail to preview
              </p>
            </div>
            <button
              type="button"
              onClick={onRemoveImage}
              aria-label="Remove image"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-red-300"
            >
              ✕
            </button>
          </div>
        )}

        <div className="relative">
          {open && (
            <ul className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-xl border border-white/10 bg-slate-900/95 shadow-2xl shadow-black/40 backdrop-blur">
              {matching.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onMouseEnter={() => moveActive(i)}
                    onClick={() => pickSkill(s)}
                    className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition ${
                      i === active ? 'bg-violet-500/20' : 'hover:bg-white/5'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-violet-300">
                        /{s.id}
                      </span>
                      <span className="block truncate text-xs text-slate-400">
                        {s.description}
                      </span>
                    </span>
                    {i === active && (
                      <span className="shrink-0 text-[10px] uppercase tracking-wide text-slate-500">
                        ↵ select
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form
            onSubmit={submit}
            className="flex flex-col sm:flex-row items-end justify-end gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 shadow-xl shadow-black/20 transition focus-within:border-blue-400/50"
          >
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label="Attach image"
              title="Attach an image (PNG, JPG, GIF, WebP) up to 4 MB"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
            </button>

            {/* Cancel/Stop generating button: shown only when the assistant is generating, on the right side */}
            {disabled && (
              <button
                type="button"
                onClick={onStopGenerating}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/20 text-red-300 transition hover:bg-red-400/30"
                title="Stop generating"
              >
                ⏹
              </button>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                handleFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />

            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
                autoResize();
              }}
              onKeyDown={handleKey}
              placeholder="Message the assistant…"
              rows={1}
              className="max-h-[200px] flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />

            {/* Send button: normal when not generating */}
            {!disabled && (
              <button
                type="submit"
                aria-label="Send"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-900/40 transition hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}