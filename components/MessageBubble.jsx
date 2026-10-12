import Markdown from './Markdown';
import SkillBadge from './SkillBadge';
import ToolCallCard from './ToolCallCard';

export default function MessageBubble({ message, onOpenImage }) {
  const isUser = message.role === 'user';
  const toolCalls = message.toolCalls || [];
  const hasPendingTool = toolCalls.some((t) => t.ok === null);

  return (
    <div className={isUser ? 'flex justify-end gap-2.5' : 'flex gap-2.5'}>
      {!isUser && <Avatar mode="bot" />}

      <div className="flex max-w-[80%] flex-col">
        {isUser ? (
          <>
            {message.image && (
              <button
                type="button"
                onClick={() => onOpenImage(message.image.dataUrl)}
                aria-label="Open attached image"
                className="group mb-1.5 w-fit"
              >
                <img
                  src={message.image.dataUrl}
                  alt="Attached image"
                  className="max-h-48 rounded-2xl object-cover ring-1 ring-white/10 transition group-hover:ring-blue-400/50"
                />
              </button>
            )}
            <div className="whitespace-pre-wrap rounded-3xl rounded-br-md bg-gradient-to-br from-blue-500 to-indigo-600 px-4 py-2.5 text-[15px] leading-relaxed text-white shadow-lg shadow-blue-900/30">
              {message.text}
            </div>
          </>
        ) : (
          <div className="rounded-3xl rounded-tl-md border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur">
            {message.skill && <SkillBadge skill={message.skill} />}

            {toolCalls.length > 0 && (
              <div className="mb-2 space-y-1.5">
                {toolCalls.map((t) => (
                  <ToolCallCard key={t.id} call={t} />
                ))}
              </div>
            )}

            {message.text ? (
              <div className="text-[15px] leading-relaxed text-slate-100">
                <Markdown>{message.text}</Markdown>
              </div>
            ) : (
              !hasPendingTool && (
                <span className="flex items-center gap-1 py-1">
                  <Dot delay="0ms" />
                  <Dot delay="150ms" />
                  <Dot delay="300ms" />
                </span>
              )
            )}

            {message.error && (
              <div className="mt-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                ⚠ {message.error.message}
              </div>
            )}
          </div>
        )}
      </div>

      {isUser && <Avatar mode="user" />}
    </div>
  );
}

function Dot({ delay }) {
  return (
    <span
      className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
      style={{ animationDelay: delay }}
    />
  );
}

function Avatar({ mode }) {
  return mode === 'user' ? (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-[10px] font-bold text-white ring-1 ring-white/10">
      YOU
    </div>
  ) : (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm shadow-lg shadow-blue-900/40">
      ✦
    </div>
  );
}
