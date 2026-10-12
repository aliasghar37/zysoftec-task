import { GoogleGenAI } from '@google/genai';

export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';

let client;

export function getGeminiClient() {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey)
      throw new Error('GEMINI_API_KEY is not set in .env (gitignored).');
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

export function createSseFramer(controller, encoder) {
  return (payload) => {
    try {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
      );
    } catch {}
  };
}
