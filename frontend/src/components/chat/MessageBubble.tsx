import { Fragment } from 'react'
import type { Source } from '@/types/conversation'

/* ------------------------------------------------------------------ */
/*  Source tag — the [n] citation embedded in grounded text            */
/* ------------------------------------------------------------------ */

export function SourceTag({
  index,
  onOpen,
  count,
}: {
  index: number
  onOpen: (i: number) => void
  count: number
}) {
  const valid = index >= 0 && index < count
  if (!valid) {
    return <span className="font-mono text-[10px] text-paper-500">[{index + 1}]</span>
  }
  return (
    <button
      type="button"
      onClick={() => onOpen(index)}
      className="inline-flex animate-tag items-baseline rounded-[4px] bg-amber-tint px-1 py-px align-baseline font-mono text-[10px] text-amber-index transition-colors duration-[120ms] hover:bg-amber-index hover:text-ink-950"
      aria-label={`Open source ${index + 1}`}
    >
      [{index + 1}]
    </button>
  )
}

type Token =
  | { type: 'text'; text: string }
  | { type: 'code'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'cite'; index: number }

const INLINE_RE = /(`[^`]+`|\*\*[^*]+\*\*|\[(\d+)\])/g

/** Minimal inline formatter: mono code, bold, and [n] citation tags. */
function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  let last = 0
  let m: RegExpExecArray | null
  INLINE_RE.lastIndex = 0
  while ((m = INLINE_RE.exec(text)) !== null) {
    if (m.index > last) tokens.push({ type: 'text', text: text.slice(last, m.index) })
    const raw = m[1]
    if (raw.startsWith('`')) tokens.push({ type: 'code', text: raw.slice(1, -1) })
    else if (raw.startsWith('**')) tokens.push({ type: 'bold', text: raw.slice(2, -2) })
    else tokens.push({ type: 'cite', index: Number(m[2]) - 1 })
    last = m.index + raw.length
  }
  if (last < text.length) tokens.push({ type: 'text', text: text.slice(last) })
  return tokens
}

function renderInline(text: string, sourceCount: number, onOpen: (i: number) => void) {
  return tokenize(text).map((token, i) => {
    switch (token.type) {
      case 'code':
        return (
          <code
            key={i}
            className="rounded-[3px] bg-amber-tint px-[0.35em] py-[0.1em] font-mono text-[0.85em] text-amber-index"
          >
            {token.text}
          </code>
        )
      case 'bold':
        return <strong key={i} className="font-semibold">{token.text}</strong>
      case 'cite':
        return <SourceTag key={i} index={token.index} onOpen={onOpen} count={sourceCount} />
      default:
        return <Fragment key={i}>{token.text}</Fragment>
    }
  })
}

/* ------------------------------------------------------------------ */

export function StreamingUnderline({ visible = true }: { visible?: boolean }) {
  if (!visible) return null
  return <span aria-hidden className="stream-underline mt-2 block w-24 rounded-full" />
}

function formatTime(iso?: string) {
  if (!iso) return null
  const utc = iso.endsWith('Z') || /[+-]\d\d:\d\d$/.test(iso) ? iso : iso + 'Z'
  return new Date(utc).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
  citations?: Source[] | null
  timestamp?: string
  onOpenSource?: (index: number) => void
}

export function MessageBubble({
  role,
  content,
  isStreaming = false,
  citations = null,
  timestamp,
  onOpenSource,
}: MessageBubbleProps) {
  const openSource = onOpenSource ?? (() => {})
  const isUser = role === 'user'
  const sources = citations ?? []
  const grounded = sources.length > 0

  if (isUser) {
    return (
      <div className="group flex animate-rise justify-end">
        <div className="flex min-w-0 max-w-[520px] flex-col items-end">
          <div className="whitespace-pre-wrap rounded-[12px] bg-ink-800 px-4 py-2.5 text-[15px] leading-relaxed text-paper-100">
            {content}
          </div>
          {timestamp && (
            <p className="mt-1 font-mono text-xs text-paper-500 opacity-0 transition-opacity duration-[120ms] group-hover:opacity-100">
              {formatTime(timestamp)}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="group flex animate-rise justify-start">
      <div className="min-w-0 max-w-[680px] flex-1">
        <div className={`relative ${grounded ? 'pl-4' : ''}`}>
          {grounded && (
            <span
              aria-hidden
              className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full bg-amber-index"
            />
          )}
          {isStreaming && !content ? (
            <div className="pt-1">
              <StreamingUnderline />
            </div>
          ) : (
            <div className="whitespace-pre-wrap text-[16px] leading-[1.55] text-paper-100">
              {renderInline(content, sources.length, openSource)}
            </div>
          )}
          {isStreaming && content && <StreamingUnderline />}
        </div>

        {grounded && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-[26px]">
            {sources.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => openSource(i)}
                className="group/tag inline-flex items-center gap-1.5 rounded-md border border-ink-700 bg-ink-800 py-0.5 pl-1.5 pr-2 font-mono text-[10px] text-paper-500 transition-colors duration-[120ms] hover:border-amber-index hover:text-amber-index"
                title={`${s.fileName ?? 'Document'}${s.chunk ? ` · ${s.chunk}` : ''}`}
              >
                <span className="h-3.5 w-[2px] rounded-full bg-amber-index" aria-hidden />
                [{i + 1}]
                <span className="max-w-[10rem] truncate text-paper-500/90">
                  {s.fileName ?? 'Document'}
                </span>
              </button>
            ))}
          </div>
        )}

        {timestamp && (
          <p className="mt-1 pl-[26px] font-mono text-xs text-paper-500 opacity-0 transition-opacity duration-[120ms] group-hover:opacity-100">
            {formatTime(timestamp)}
          </p>
        )}
      </div>
    </div>
  )
}