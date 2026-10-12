import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';

export default function MessageList({ messages, onOpenImage, skills }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
        {messages.length === 0 && (
          <div className="mt-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-2xl shadow-lg shadow-blue-900/40">
              ✦
            </div>
            <h2 className="text-lg font-semibold text-slate-100">
              How can I help?
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Ask a question, send a picture, check the weather, or trigger a
              skill.
            </p>
            {skills.length > 0 && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {skills.map((s) => (
                  <span
                    key={s.id}
                    title={s.description}
                    className="rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300"
                  >
                    /{s.id}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} onOpenImage={onOpenImage} />
        ))}

        <div ref={endRef} />
      </div>
    </div>
  );
}
