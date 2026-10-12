import { NextResponse } from 'next/server';
import {
  GEMINI_MODEL,
  getGeminiClient,
  createSseFramer,
} from '../../../lib/server/gemini';
import { normalizeError } from '../../../lib/server/errors';
import {
  getWeatherDeclaration,
  runGetWeather,
} from '../../../lib/server/tools/get-weather';
import { resolveSkillCommand, autoPickSkill } from '../../../lib/server/skills';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_INSTRUCTION =
  'You are a helpful AI assistant. Always reply in English, be concise, and use markdown when it makes your answer clearer. If you do not know something, say so.';

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const BASE64_RE = /^[A-Za-z0-9+/=]+$/;
const MAX_TOOL_ROUNDS = 3;

function validateMessages(messages) {
  for (const m of messages) {
    if (!m || (m.role !== 'user' && m.role !== 'model')) {
      return 'Each message must have role "user" or "model".';
    }
    if (!Array.isArray(m.parts) || m.parts.length === 0) {
      return 'Each message must have a non-empty "parts" array.';
    }
    for (const part of m.parts) {
      if (typeof part.text === 'string') continue;
      if (part.inlineData) {
        const { mimeType, data } = part.inlineData;
        if (typeof mimeType !== 'string' || !mimeType.startsWith('image/')) {
          return 'Image parts must have an image/* mimeType.';
        }
        if (typeof data !== 'string' || !BASE64_RE.test(data)) {
          return 'Image data must be valid base64.';
        }
        const padding = data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0;
        const bytes = (data.length * 3) / 4 - padding;
        if (bytes > MAX_IMAGE_BYTES) {
          return 'Image must be 4 MB or smaller.';
        }
        continue;
      }
      return 'Each part must be { text } or { inlineData }.';
    }
  }
  return null;
}

async function runTool(name, args) {
  try {
    if (name === 'get_weather') return await runGetWeather(args);
    return { ok: false, error: `Unknown tool "${name}".` };
  } catch (err) {
    return { ok: false, error: err.message || 'Tool failed.' };
  }
}

async function resolveTurnSkill(lastMessage) {
  const textIndex = lastMessage.parts.findIndex(
    (p) => typeof p.text === 'string',
  );
  if (textIndex < 0) return { textIndex };

  const text = lastMessage.parts[textIndex].text;
  const resolved = await resolveSkillCommand(text);
  const skill = resolved ? resolved.skill : await autoPickSkill(text);
  if (!skill) return { textIndex };

  const systemInstruction = `${SYSTEM_INSTRUCTION}\n\nApply the skill "${skill.name}" now.\n\n${skill.instructions}`;
  const lastUserParts = resolved
    ? lastMessage.parts.map((p, i) =>
        i === textIndex ? { text: resolved.rest || 'Start the skill.' } : p,
      )
    : null;
  return { textIndex, activeSkill: skill, systemInstruction, lastUserParts };
}

function runDemoError(DEMO_ERROR, send, controller) {
  if (DEMO_ERROR === 'stream') {
    send({
      type: 'text',
      delta: 'This reply was interrupted mid-word before it',
    });
    try {
      controller.close();
    } catch {}
    return true;
  }
  if (DEMO_ERROR === 'tool') {
    send({
      type: 'tool_call',
      id: 'demo_1',
      name: 'get_weather',
      args: { city: 'Demo' },
    });
    send({
      type: 'tool_result',
      id: 'demo_1',
      name: 'get_weather',
      ok: false,
      result: 'Demo tool failure (forced by DEMO_ERROR=tool)',
    });
    send({
      type: 'text',
      delta:
        '**Demo:** the weather tool threw an error. The call card above shows the failure and the assistant acknowledges it — this is the error-recovery path.',
    });
  } else if (DEMO_ERROR === 'rate_limit') {
    send({
      type: 'error',
      code: 'rate_limit',
      message: 'Rate limit reached. Wait a few seconds and try again.',
    });
  } else if (DEMO_ERROR === 'api') {
    send({
      type: 'error',
      code: 'api',
      message: 'The model service failed. Please try again in a moment.',
    });
  } else if (DEMO_ERROR) {
    send({
      type: 'error',
      code: 'api',
      message: `Unknown DEMO_ERROR mode "${DEMO_ERROR}". Use api | rate_limit | stream | tool.`,
    });
  }
  if (DEMO_ERROR) {
    send({ type: 'done' });
    try {
      controller.close();
    } catch {}
    return true;
  }
  return false;
}

export async function POST(req) {
  const DEMO_ERROR = process.env.DEMO_ERROR || '';

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Request body must be JSON.' },
      { status: 400 },
    );
  }

  const { messages } = body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      {
        error: '"messages" must be a non-empty array of { role, parts }.',
      },
      { status: 400 },
    );
  }

  const validationError = validateMessages(messages);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const lastMessage = messages[messages.length - 1];
  const {
    activeSkill = null,
    systemInstruction = SYSTEM_INSTRUCTION,
    lastUserParts = null,
  } = await resolveTurnSkill(lastMessage);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = createSseFramer(controller, encoder);

      if (runDemoError(DEMO_ERROR, send, controller)) return;

      if (activeSkill) send({ type: 'skill', skill: activeSkill.id });
      const contents = messages.map((m, i) =>
        i === messages.length - 1 && lastUserParts
          ? { role: m.role, parts: lastUserParts }
          : { ...m },
      );
      let lastCall = null;

      try {
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const response = await getGeminiClient().models.generateContentStream(
            {
              model: GEMINI_MODEL,
              contents,
              config: {
                systemInstruction,
                thinkingConfig: { thinkingLevel: 'medium' },
                tools: [{ functionDeclarations: [getWeatherDeclaration] }],
                toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
              },
            },
          );

          const modelParts = [];
          let call = null;
          for await (const chunk of response) {
            const candidate = chunk.candidates?.[0];
            if (candidate?.content?.parts) {
              modelParts.push(...candidate.content.parts);
            }
            const text = chunk.text;
            if (text) send({ type: 'text', delta: text });
            if (!call && chunk.functionCalls?.length) {
              call = chunk.functionCalls[0];
            }
          }

          lastCall = call;
          if (!call) break;

          const id = call.id || `tool_${round}_${Date.now()}`;
          send({ type: 'tool_call', id, name: call.name, args: call.args });

          const res = await runTool(call.name, call.args);
          send({
            type: 'tool_result',
            id,
            name: call.name,
            ok: res.ok,
            result: res.ok ? res.result : res.error,
          });

          contents.push({ role: 'model', parts: modelParts });
          contents.push({
            role: 'user',
            parts: [
              {
                functionResponse: {
                  name: call.name,
                  response: res.ok ? res.result : { error: res.error },
                },
              },
            ],
          });
        }

        if (lastCall) {
          send({
            type: 'error',
            code: 'api',
            message: 'Too many tool calls in a row — stopped.',
          });
        }
      } catch (err) {
        const { code, message } = normalizeError(err);
        if (process.env.NODE_ENV === 'development') {
          console.log(
            '[route catch]',
            err?.status,
            JSON.stringify(err?.message || '').slice(0, 200),
          );
        }
        send({ type: 'error', code, message });
      }
      send({ type: 'done' });
      try {
        controller.close();
      } catch {}
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
