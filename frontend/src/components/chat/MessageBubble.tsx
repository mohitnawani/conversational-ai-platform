import { Fragment, useState } from 'react'
import { Check, Copy, Sparkles } from 'lucide-react'
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
        return <strong key={i} className="font-semibold text-paper-100">{token.text}</strong>
      case 'cite':
        return <SourceTag key={i} index={token.index} onOpen={onOpen} count={sourceCount} />
      default:
        return <Fragment key={i}>{token.text}</Fragment>
    }
  })
}

/* ------------------------------------------------------------------ */
/*  Fenced code blocks — ```lang blocks get a framed, copyable panel   */
/* ------------------------------------------------------------------ */

const FENCE_RE = /```([\w+-]*)\n?([\s\S]*?)(?:```|$)/g

type Block = { type: 'text'; text: string } | { type: 'code'; lang: string; code: string }

/** Split an assistant reply into prose and fenced code blocks. */
function splitBlocks(raw: string): Block[] {
  const blocks: Block[] = []
  let last = 0
  let m: RegExpExecArray | null
  FENCE_RE.lastIndex = 0
  while ((m = FENCE_RE.exec(raw)) !== null) {
    if (m.index > last) blocks.push({ type: 'text', text: raw.slice(last, m.index) })
    blocks.push({
      type: 'code',
      lang: (m[1] || '').trim() || 'code',
      code: m[2].replace(/\n$/, ''),
    })
    last = m.index + m[0].length
  }
  if (last < raw.length) blocks.push({ type: 'text', text: raw.slice(last) })
  return blocks
}

function useCopy() {
  const [copied, setCopied] = useState(false)
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }
  return { copied, copy }
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const { copied, copy } = useCopy()
  return (
    <div className="group/code my-2.5 overflow-hidden rounded-xl border border-ink-700 bg-ink-950/80">
      <div className="flex items-center justify-between border-b border-ink-700/70 bg-ink-900/60 px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper-500">
          {lang}
        </span>
        <button
          type="button"
          onClick={() => void copy(code)}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[10px] text-paper-500 transition-colors duration-[120ms] hover:bg-ink-800 hover:text-amber-index"
        >
          {copied ? <Check size={11} className="text-success-mint" /> : <Copy size={11} />}
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
      <pre className="overflow-x-auto px-3.5 py-3 font-mono text-[13px] leading-relaxed text-paper-100">
        <code>{code}</code>
      </pre>
    </div>
  )
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
  label?: string
  onOpenSource?: (index: number) => void
}

export function MessageBubble({
  role,
  content,
  isStreaming = false,
  citations = null,
  timestamp,
  label,
  onOpenSource,
}: MessageBubbleProps) {
  const openSource = onOpenSource ?? (() => {})
  const isUser = role === 'user'
  const sources = citations ?? []
  const grounded = sources.length > 0
  const { copied, copy } = useCopy()

  if (isUser) {
    return (
      <div className="group flex animate-rise justify-end">
        <div className="flex min-w-0 max-w-[520px] flex-col items-end">
          <div className="rounded-2xl border border-ink-700/60 bg-ink-800 px-4 py-2.5 text-[15px] leading-relaxed text-paper-100 shadow-sm">
            {content}
          </div>
          {timestamp && (
            <p className="mt-1.5 font-mono text-xs text-paper-500 opacity-0 transition-opacity duration-[120ms] group-hover:opacity-100">
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
        <div className="mb-1.5 flex items-center gap-2">
          <span
            aria-hidden
            className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-amber-tint text-amber-index"
          >
            <Sparkles size={12} strokeWidth={2.2} />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper-500">
            {label ?? 'Assistant'}
          </span>
          {timestamp && (
            <span className="font-mono text-xs text-paper-500 opacity-0 transition-opacity duration-[120ms] group-hover:opacity-100">
              {formatTime(timestamp)}
            </span>
          )}
          <button
            type="button"
            onClick={() => void copy(content)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-ink-700 bg-ink-900 px-2 py-1 font-mono text-[10px] text-paper-500 opacity-0 transition-all duration-[120ms] hover:border-amber-index hover:text-amber-index group-hover:opacity-100"
            aria-label="Copy assistant reply"
          >
            {copied ? <Check size={11} className="text-success-mint" /> : <Copy size={11} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div className="relative rounded-2xl border border-line/70 bg-card px-[18px] py-4 shadow-sm">
          {grounded && (
            <span
              aria-hidden
              className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full bg-amber-index"
            />
          )}
          {isStreaming && !content ? (
            <div className="pt-1">
              <StreamingUnderline />
            </div>
          ) : (
            <div className="whitespace-pre-wrap text-[16px] leading-[1.55] text-paper-100">
              {isStreaming
                ? renderInline(content, sources.length, openSource)
                : splitBlocks(content).map((block, i) =>
                    block.type === 'code' ? (
                      <CodeBlock key={i} lang={block.lang} code={block.code} />
                    ) : (
                      <Fragment key={i}>
                        {renderInline(block.text, sources.length, openSource)}
                      </Fragment>
                    ),
                  )}
            </div>
          )}
          {isStreaming && content && <StreamingUnderline />}
        </div>

        {grounded && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-1">
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
      </div>
    </div>
  )
}