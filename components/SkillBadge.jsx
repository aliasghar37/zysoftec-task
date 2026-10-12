export default function SkillBadge({ skill }) {
  return (
    <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/15 px-2.5 py-1 text-xs font-medium text-violet-300">
      <span className="text-[10px]">⚡</span> Skill: {skill}
    </span>
  );
}
