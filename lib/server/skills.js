import fs from 'fs';
import path from 'path';
import { getGeminiClient, GEMINI_MODEL } from './gemini';

const SKILLS_DIR = path.join(process.cwd(), 'skills');

function parseSkillFile(id, raw) {
  const fm = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/.exec(raw);
  const meta = {};
  if (fm) {
    for (const line of fm[1].split('\n')) {
      const idx = line.indexOf(':');
      if (idx > 0) meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
  }
  return {
    id,
    name: meta.name || id,
    description: meta.description || '',
    instructions: (fm ? fm[2] : raw).trim(),
  };
}

export async function loadSkills() {
  let files;
  try {
    files = await fs.promises.readdir(SKILLS_DIR);
  } catch {
    return []; // missing skills dir -> no skills
  }
  const skills = [];
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    try {
      const raw = await fs.promises.readFile(
        path.join(SKILLS_DIR, file),
        'utf8',
      );
      skills.push(parseSkillFile(file.slice(0, -3), raw));
    } catch {
      // Skip unreadable files rather than breaking the request.
    }
  }
  return skills;
}

export async function resolveSkillCommand(text) {
  const match = /^\s*\/([\w-]+)\b/.exec(text || '');
  if (!match) return null;
  const skills = await loadSkills();
  const skill = skills.find((s) => s.id === match[1]);
  if (!skill) return null;
  return {
    skill,
    rest: text.slice(match[0].length).trim(),
  };
}

function classifySystemPrompt(skills) {
  return `You are a skill router. Decide whether the user's message should activate
one of the skills below.

Reply with exactly ONE line: either the skill's command (e.g. /lesson-planner)
or the single word NONE. Do not add any other text.

Pick a skill only when the message is clearly about that skill's purpose.

Skills:
${skills.map((s) => `- /${s.id}: ${s.name} — ${s.description}`).join('\n')}`;
}

export async function autoPickSkill(lastText) {
  try {
    const skills = await loadSkills();
    if (!skills.length || !lastText) return null;

    const response = await getGeminiClient().models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts: [{ text: lastText }] }],
      config: {
        systemInstruction: classifySystemPrompt(skills),
        maxOutputTokens: 20,
      },
    });

    const reply = (response.text || '').trim().toLowerCase();
    if (reply.split(/[^a-z0-9-]+/).includes('none')) return null;
    const id = reply.match(/\/?([\w-]+)/)?.[1];
    return skills.find((s) => s.id === id) || null;
  } catch {
    return null;
  }
}
