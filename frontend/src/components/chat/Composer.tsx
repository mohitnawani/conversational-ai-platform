import { useRef, useState, type KeyboardEvent } from 'react'
import { ArrowUp, Paperclip } from 'lucide-react'

interface ComposerProps {
  onSend: (text: string) => void
  disabled?: boolean
  placeholder?: string
}

/**
 * Composer: attach (left) + auto-growing textarea + amber send circle.
 * Attach opens a chip-styled sheet reusing the "index tab" motif.
 */
export function Composer({ onSend, disabled, placeholder }: ComposerProps) {
  const [text, setText] = useState('')
  const [attachOpen, setAttachOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const canSend = text.trim().length > 0 && !disabled

  function handleSend() {
    if (!canSend) return
    onSend(text.trim())
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function autoGrow(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 150)}px`
  }

  return (
    <div className="shrink-0 px-3 pb-3 pt-2 sm:px-5 sm:pb-4">
      <div className="relative mx-auto max-w-[720px]">
        <div className="flex items-end gap-2 rounded-xl border border-ink-700 bg-ink-800 px-3 py-2.5 transition-colors duration-150 focus-within:border-amber-index focus-within:shadow-[0_0_0_3px_rgba(217,164,65,0.15)]">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setAttachOpen((v) => !v)}
              aria-label="Attach a source"
              aria-expanded={attachOpen}
              className={`rounded-lg p-2 transition-colors duration-[120ms] ${
                attachOpen
                  ? 'bg-amber-index text-ink-950'
                  : 'text-paper-500 hover:bg-ink-700/60 hover:text-paper-100'
              }`}
            >
              <Paperclip size={17} />
            </button>

            {attachOpen && (
              <>
                <button
                  aria-label="Close attach menu"
                  className="fixed inset-0 z-30"
                  onClick={() => setAttachOpen(false)}
                />
                <div className="animate-tag absolute bottom-11 left-0 z-40 w-72 rounded-xl border border-ink-700 bg-ink-900 p-2 shadow-2xl">
                  <p className="px-2 pb-2 pt-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-paper-500">
                    Sources
                  </p>
                  <p className="flex items-center gap-2 rounded-lg border border-dashed border-ink-700 px-2.5 py-2 text-xs text-paper-500">
                    <span className="h-3.5 w-[2px] shrink-0 rounded-full bg-amber-index" aria-hidden />
                    Uploaded sources will appear here as index tabs.
                  </p>
                </div>
              </>
            )}
          </div>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              autoGrow(e.target)
            }}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={placeholder ?? 'Ask anything…'}
            disabled={disabled}
            aria-label="Message"
            className="max-h-[150px] flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-relaxed text-paper-100 outline-none placeholder:text-paper-500/50 disabled:opacity-50"
          />

          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            aria-label="Send message"
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-[120ms] ${
              canSend
                ? 'bg-amber-index text-ink-950 hover:bg-amber-index-deep'
                : 'cursor-not-allowed bg-ink-700 text-paper-500'
            }`}
          >
            <ArrowUp size={16} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </div>
  )
}