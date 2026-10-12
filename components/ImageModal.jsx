import { useEffect } from 'react';

export default function ImageModal({ src, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <img
          src={src}
          alt="Full size preview"
          className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl ring-1 ring-white/10"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-300 shadow-lg ring-1 ring-white/10 transition hover:bg-slate-700 hover:text-white"
        >
          ✕
        </button>
      </div>
    </div>
  );
}