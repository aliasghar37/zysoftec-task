# Streaming AI Chat with Tools & Skills

A take-home task built with **Next.js 14 (App Router)**, **React**, and **Google Gemini Flash** (`@google/genai`). No TypeScript, no agent frameworks — plain JavaScript, self-contained.

## Setup

1. Clone the repo and install deps:
   ```bash
   npm install
   ```
2. Create a `.env` file with your Gemini key:
   ```env
   GEMINI_API_KEY=your_key_here
   GEMINI_MODEL=gemini-3.1-flash-lite
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000

The `.env` file is gitignored — never commit API keys.

## Core Features (verified)

| Feature                      | How it works                                                                                                                                                                                                                                                                              |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ | ------------------------------------------- |
| **Chat UI**                  | Message list + composer with image attachment, auto-resizing textarea, sending lock while generating.                                                                                                                                                                                     |
| **Image input**              | Attach one image (≤4 MB). Preview before sending. The model actually uses the image in its reply.                                                                                                                                                                                         |
| **Streaming replies**        | Token-by-token delta rendering via SSE (`text/event-stream`). The UI shows a generating pulse and disables send overlap.                                                                                                                                                                  |
| **Tool: `get_weather`**      | Model decides when to call it (not keyword-matched). UI shows the call card + result, then the assistant continues streaming. Mock data with ~450 ms latency.                                                                                                                             |
| **Skill: `/lesson-planner`** | Typing `/lesson-planner` at the start of a message activates the skill — the assistant replies with the 4-section markdown (In one sentence / Walkthrough / Key concepts / Gotchas). New skill = one new `.md` file, zero code changes (auto-discovered from `skills/` on every request). |
| **Auto skill** (stretch)     | Without a slash, the model can itself pick the relevant skill from the message. One tiny flash-lite “router” call decides `/lesson-planner` or `/code-explainer` or `NONE`.                                                                                                               |
| **Stop generating**          | A ⏹ button appears while the assistant is thinking. Clicking it aborts the SSE stream immediately, removes the partial reply, and re-enables the composer. Also a 60-second hard timeout guards against hangs.                                                                            |
| **Error handling (5 cases)** | `api` failure, `rate_limit` (429), mid-stream interruption (no `done`), tool throw (card ⚠ + recovery), bad/oversized image (inline composer error). A dev env var `DEMO_ERROR=api                                                                                                        | rate_limit | stream | tool` forces each case for on-camera demos. |
| **Skill picker (`/`)**       | Typing `/` opens a dropdown above the input, auto-filtered as you type. Pick by click, Arrow↑/↓+Enter, or Esc. Selection inserts `/skill ` and focuses the textarea.                                                                                                                      |

## Design decisions

- **SSE wire** — one connection, one event per line (`data: {json}\n\n`). The `createSseFramer` swallows the `Controller is already closed` race (bug B4) so a client disconnect doesn't crash the server.
- **Tool loop** — echoes `chunk.candidates[0].content.parts` verbatim (fixes `chunk.parts` undefined → keeps Gemini 3 `thoughtSignature`). `MAX_TOOL_ROUNDS = 3` bounds the loop.
- **Skill loader** — `lib/server/skills.js` calls `fs.readdir` on `skills/` **on every request**. Drop in `my-skill.md` and `/my-skill` works instantly — no code change, no restart. Only contract: `name` + `description` frontmatter.
- **Auto-skill router** — one `generateContent` call (non-streaming, `maxOutputTokens: 20`) with a system prompt listing each skill's `id/name/description`. Model replies `/<id>` or `NONE`. Failures → `null`, chat proceeds unchanged.
- **AbortController** — 60-second hard timeout + optional UI stop button. The send lock (`disabled={isGenerating}`) prevents overlapping requests.
- **No agent frameworks** — pure `@google/genai`, classic `generateContentStream`, manual tool loop, manual skill injection.

## What was implemented & what's missing

- **Core**: streaming, image, tool, skills (slash + auto), error handling (5 cases), stop button, skill picker.
- **Stretch (optional)**: markdown rendering in assistant messages (already live via `react-markdown@10` + `remark-gfm@4`).
- **Not done**: README + screen-recording script + Git push (per contract I never commit).

## Trade-offs

- The auto-skill router adds ~0.3–1 s per non-slash request (one tiny flash-lite call). For the demo this is acceptable; in production it could be cached or gated.
- The stop button is UI-only; the server always has the 60-second hard timeout as fallback.
- Skill file auto-discovery means adding a skill is literally adding one markdown file — but the folder is scanned on every request, which is fine for a demo but would be cached in production.

## Credits

Built during a single working day as a take-home task. All code is uncommitted on the working tree — ready for you to review, commit, and push.
