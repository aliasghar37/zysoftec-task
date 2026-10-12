import { NextResponse } from 'next/server';
import { loadSkills } from '../../../lib/server/skills';

export const runtime = 'nodejs';

export async function GET() {
  const skills = await loadSkills();
  return NextResponse.json({
    skills: skills.map(({ id, name, description }) => ({
      id,
      name,
      description,
    })),
  });
}
