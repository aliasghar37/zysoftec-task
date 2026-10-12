'use client';

import { useState, useEffect } from 'react';
import MessageList from './MessageList';
import Composer from './Composer';
import ImageModal from './ImageModal';
import { streamChat } from '@/lib/client/stream';

function toApiMessages(history, current) {
  const parts = (m) => [
    { text: m.text },
    ...(m.image
      ? [
          {
            inlineData: {
              mimeType: m.image.mimeType,
              data: m.image.dataUrl.split(',')[1],
            },
          },
        ]
      : []),
  ];
  const api = history
    .filter((m) => m.role === 'user' || (m.role === 'assistant' && m.text))
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: parts(m),
    }));
  api.push({ role: 'user', parts: parts(current) });
  return api;
}

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [image, setImage] = useState(null);
  const [imageError, setImageError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [skills, setSkills] = useState([]);

  // Holds the AbortController so the UI can interrupt the stream.
  const controller = new AbortController();

  // Cancel the current generation — removes the pending assistant message
  // and resets the send lock so the user can type a new message.
  const stopGenerating = () => {
    controller.abort();
    setIsGenerating(false);
    // Remove the most recent assistant message (the one with empty text).
    setMessages((prev) =>
      prev.filter((m) => m.role !== 'assistant' || m.text !== ''),
    );
  };

  useEffect(() => {
    fetch('/api/skills')
      .then((r) => r.json())
      .then((data) => setSkills(data.skills || []))
      .catch(() => setSkills([]));
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || isGenerating) return;

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'user',
        text,
        image,
        skill: null,
        toolCalls: [],
        error: null,
      },
      {
        id: assistantId,
        role: 'assistant',
        text: '',
        image: null,
        skill: null,
        toolCalls: [],
        error: null,
      },
    ]);
    setInput('');
    setImage(null);
    setImageError(null);
    setIsGenerating(true);

    const apiMessages = toApiMessages(messages, { text, image });

    const patchAssistant = (fn) =>
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? fn(m) : m)),
      );

    try {
      await streamChat({
        messages: apiMessages,
        signal: controller.signal,
        onEvent: (event) => {
          if (event.type === 'text') {
            patchAssistant((m) => ({ ...m, text: m.text + event.delta }));
          } else if (event.type === 'error') {
            patchAssistant((m) => ({ ...m, error: event }));
          } else if (event.type === 'skill') {
            patchAssistant((m) => ({ ...m, skill: event.skill }));
          } else if (event.type === 'tool_call') {
            patchAssistant((m) => ({
              ...m,
              toolCalls: [
                ...m.toolCalls,
                {
                  id: event.id,
                  name: event.name,
                  args: event.args,
                  ok: null,
                  result: null,
                },
              ],
            }));
          } else if (event.type === 'tool_result') {
            patchAssistant((m) => ({
              ...m,
              toolCalls: m.toolCalls.map((t) =>
                t.id === event.id
                  ? { ...t, ok: event.ok, result: event.result }
                  : t,
              ),
            }));
          }
        },
      });
    } catch (err) {
      patchAssistant((m) => ({
        ...m,
        error: { code: 'api', message: 'Request failed. Please try again.' },
      }));
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    fetch('/api/skills')
      .then((r) => r.json())
      .then((data) => setSkills(data.skills || []))
      .catch(() => setSkills([]));
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100">
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-white/10 bg-slate-900/50 px-6 py-3 backdrop-blur">
          <div className="flex items-center gap-2.5">
            <h1 className="text-sm font-semibold text-slate-200">
              AI Chat App
            </h1>
          </div>
        </header>

        <MessageList
          messages={messages}
          onOpenImage={setLightbox}
          skills={skills}
        />

        <Composer
          value={input}
          onChange={setInput}
          onSend={send}
          disabled={isGenerating}
          skills={skills}
          image={image}
          imageError={imageError}
          onPickImage={(img) => {
            setImage(img);
            setImageError(null);
          }}
          onImageError={setImageError}
          onRemoveImage={() => {
            setImage(null);
            setImageError(null);
          }}
          onPreviewImage={setLightbox}
          onStopGenerating={stopGenerating}
        />
      </main>

      {lightbox && (
        <ImageModal src={lightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}
