import { useEffect, useRef } from 'react'
import { FileText, X } from 'lucide-react'
import type { Source } from '@/types/conversation'

interface SourceDrawerProps {
  open: boolean
  sources: Source[]
  activeIndex: number | null
  onClose: () => void
  onPick: (index: number) => void
}

/**
 * Peer citation panel that slides in from the right (bottom sheet on
 * mobile). Never dims the screen — it is context, not interruption.
 */
export function SourceDrawer({
  open,
  sources,
  activeIndex,
  onClose,
  onPick,
}: SourceDrawerProps) {
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    if (open && activeIndex != null) {
      cardRefs.current[activeIndex]?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [open, activeIndex])

  if (!open) return null

  return (
    <>
      <button
        aria-label="Close source panel"
        className="absolute inset-0 z-20 lg:hidden"
        onClick={onClose}
      />
      <aside
        className="animate-drawer-in absolute inset-y-0 right-0 z-30 flex w-[min(400px,92vw)] flex-col border-l border-ink-700 bg-ink-900 max-lg:inset-x-0 max-lg:inset-y-auto max-lg:bottom-0 max-lg:max-h-[70%] max-lg:w-auto max-lg:animate-sheet-up max-lg:border-l-0 max-lg:border-t"
        aria-label="Sources"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-ink-700 px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper-500">
            Source index
            <span className="ml-2 text-amber-index">
              {String(sources.length).padStart(2, '0')}
            </span>
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sources"
            className="rounded-md p-1.5 text-paper-500 transition-colors duration-[120ms] hover:bg-ink-800 hover:text-paper-100"
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
          {sources.map((s, i) => {
            const active = activeIndex === i
            return (
              <button
                key={i}
                ref={(el) => {
                  cardRefs.current[i] = el
                }}
                type="button"
                onClick={() => onPick(i)}
                className={`w-full rounded-lg border p-3.5 text-left transition-colors duration-[120ms] ${
                  active
                    ? 'border-amber-index bg-amber-tint shadow-[inset_2px_0_0_0_var(--amber-index)]'
                    : 'border-ink-700 bg-ink-800 hover:border-ink-700/80 hover:bg-ink-800/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileText size={14} className="shrink-0 text-amber-index" />
                  <p className="flex-1 truncate font-mono text-[11px] text-paper-100">
                    {s.fileName ?? 'Document'}
                  </p>
                  {s.chunk && (
                    <p className="shrink-0 font-mono text-[10px] text-paper-500">
                      {s.chunk.startsWith('p.') || /^[0-9]{2}:/.test(s.chunk)
                        ? s.chunk
                        : `p.${s.chunk}`}
                    </p>
                  )}
                </div>
                <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-paper-500">
                  {s.excerpt || 'Source passage not available.'}
                </p>
              </button>
            )
          })}
          {sources.length === 0 && (
            <p className="px-2 py-8 text-center text-sm text-paper-500">
              No sources attached to this reply.
            </p>
          )}
        </div>
      </aside>
    </>
  )
}