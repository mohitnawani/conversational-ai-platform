/**
 * Turn any raw failure text (provider JSON blobs, axios "Request failed with
 * status code X", fetch network errors, stream hiccups) into one short,
 * actionable line for the UI. Never shows a wall of provider text.
 */
export function friendlyError(raw: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const text = typeof raw === 'string' ? raw : raw instanceof Error ? raw.message : ''
  if (!text) return fallback
  const t = text.toLowerCase()

  if (t.includes('failed to fetch') || t.includes('network error') || t.includes('networkerror')) {
    return 'Can\u2019t reach the server. Check your connection and try again.'
  }
  if (t.includes('429') || t.includes('too many requests') || t.includes('resource_exhausted')
    || t.includes('quota') || t.includes('rate limit') || t.includes('busy right now')) {
    return 'The AI service is busy right now. Please wait a moment and try again.'
  }
  if (t.includes('token limit') || t.includes('maximum context') || t.includes('too many tokens')
    || t.includes('too long') || t.includes('exceeds the')) {
    return 'This message is too long for the AI model. Please shorten it and try again.'
  }
  if (t.includes('401') || t.includes('403') || t.includes('api key') || t.includes('authentication')) {
    return 'AI service authentication failed. Please try again later.'
  }
  if (t.includes('404') || t.includes('no longer available') || t.includes('model not found')) {
    return 'The AI model is unavailable right now. Please try again later.'
  }
  if (t.includes('timeout') || t.includes('timed out') || t.includes('deadline') || t.includes('aborted')) {
    return 'The AI took too long to respond. Please try again.'
  }
  if (t.includes('stream ended') || t.includes('stream failed') || t.includes('unexpected end')) {
    return 'The reply was interrupted. Please try again.'
  }
  const statusMatch = text.match(/status code (\d{3})/i)
  if (statusMatch) {
    const code = Number(statusMatch[1])
    return code >= 500
      ? 'The server had a problem. Please try again in a moment.'
      : fallback
  }

  const trimmed = text.trim()
  // Trust short messages (the backend already sends friendly text), but never
  // let a long raw provider dump reach the user.
  if (trimmed.length > 0 && trimmed.length <= 160) return trimmed
  return fallback
}
