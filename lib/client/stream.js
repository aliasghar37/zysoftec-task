export async function streamChat({ messages, onEvent, signal }) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
    signal,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body.error) message = body.error;
    } catch {}
    throw { code: 'http', message };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let sawDone = false;

  const handle = (event) => {
    if (event.type === 'done') sawDone = true;
    onEvent(event);
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sep;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const dataLine = frame.split('\n').find((l) => l.startsWith('data:'));
        if (dataLine) handle(JSON.parse(dataLine.slice(5).trim()));
      }
    }
  } catch {
    handle({
      type: 'error',
      code: 'aborted',
      message: 'The response was interrupted.',
    });
    return;
  }

  if (!sawDone) {
    handle({
      type: 'error',
      code: 'aborted',
      message: 'The response was interrupted.',
    });
  }
}