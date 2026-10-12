export default function ToolCallCard({ call }) {
  const pending = call.ok === null;
  const city = call.args?.city;

  return (
    <div className="inline-flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs">
      {pending ? (
        <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-blue-400/40 border-t-blue-400" />
      ) : call.ok ? (
        <span className="shrink-0 text-emerald-400">✓</span>
      ) : (
        <span className="shrink-0 text-red-400">⚠</span>
      )}

      <div className="min-w-0">
        <p className="text-slate-300">
          <span className="font-semibold text-blue-300">{call.name}</span>
          {city && <span className="text-slate-400"> · {city}</span>}
        </p>
        {!pending && (
          <p className={call.ok ? 'text-slate-400' : 'text-red-300'}>
            {formatResult(call)}
          </p>
        )}
      </div>
    </div>
  );
}

function formatResult(call) {
  if (!call.ok) return call.result;
  const r = call.result || {};
  if (r.temperature_c != null) {
    return `${r.temperature_c}°C · ${r.condition} · humidity ${r.humidity}%`;
  }
  return JSON.stringify(r);
}
