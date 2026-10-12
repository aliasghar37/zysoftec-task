function isRateLimit(err, status) {
  if (status === 429) return true;
  const msg = err && typeof err.message === 'string' ? err.message : '';
  return /RESOURCE_EXHAUSTED|rate\s*limit/i.test(msg);
}

export function normalizeError(err) {
  const status = Number((err && (err.status || err.code)) || null);

  if (isRateLimit(err, status)) {
    return {
      code: 'rate_limit',
      message: 'Rate limit reached. Wait a few seconds and try again.',
    };
  }

  if (status >= 400 && status < 500) {
    return {
      code: 'invalid_request',
      message: `The model service rejected the request (${status}). Check the API key and model.`,
    };
  }

  return {
    code: 'api',
    message: 'The model service failed. Please try again in a moment.',
  };
}
