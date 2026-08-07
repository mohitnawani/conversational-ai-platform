import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import type { Persona } from '@/types/conversation'

interface PersonaPickerModalProps {
  open: boolean
  personas: Persona[]
  loading: boolean
  error: boolean
  onPick: (persona: Persona) => void
  onSkip: () => void
  onClose: () => void
}

export function PersonaPickerModal({
  open,
  personas,
  loading,
  error,
  onPick,
  onSkip,
  onClose,
}: PersonaPickerModalProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!open || !mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Choose a persona"
    >
      <button
        aria-label="Close dialog"
        className="absolute inset-0 cursor-default bg-black/50"
        onClick={onClose}
      />
      <div className="stagger relative w-full max-w-lg rounded-xl border border-ink-700 bg-ink-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-amber-index">
              New thread
            </p>
            <h3 className="mt-2 font-display text-2xl font-medium leading-tight text-paper-100">
              Who are you talking to?
            </h3>
            <p className="mt-1 text-sm text-paper-500">
              Each persona indexes and answers differently — pick the one that fits the thread.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-paper-500 transition-colors duration-[120ms] hover:bg-ink-800 hover:text-paper-100"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-5">
          {loading ? (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-ink-800/60" aria-hidden />
              ))}
            </div>
          ) : error ? (
            <p className="rounded-xl border border-dashed border-ink-700 p-4 text-xs text-paper-500">
              Personas didn't load — you can still start with Mentor.
            </p>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {personas.map((persona) => (
                <button
                  key={persona.id}
                  type="button"
                  onClick={() => onPick(persona)}
                  className="flex flex-col gap-1.5 rounded-xl border border-ink-700 bg-ink-800 p-3.5 text-left transition-colors duration-[120ms] hover:border-amber-index/50 hover:bg-ink-800/80"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-paper-100">{persona.name}</span>
                    <span className="rounded border border-ink-700 px-1.5 py-0.5 font-mono text-[0.6rem] tracking-wide text-paper-500">
                      {persona.default_memory_type}
                    </span>
                  </span>
                  <span className="text-xs leading-relaxed text-paper-500">
                    {persona.description}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm text-paper-500 transition-colors duration-[120ms] hover:text-paper-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="rounded-lg bg-amber-index px-4 py-2 text-sm font-medium text-ink-950 transition-colors duration-150 hover:bg-amber-index-deep"
          >
            Start with Mentor
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}