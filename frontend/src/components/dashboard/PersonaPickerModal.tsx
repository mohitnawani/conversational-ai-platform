'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
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
  // Guard against SSR / hydration mismatch — document.body only exists on the client
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!open || !mounted) return null

  return createPortal(
    <div
      className="modal modal-open z-[9999]"
      role="dialog"
      aria-modal="true"
      aria-label="Choose a persona"
    >
      <div className="modal-box max-w-lg bg-base-100 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-eyebrow uppercase text-primary">
              <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle" />
              New thread
            </p>
            <h3 className="mt-2 font-display text-heading font-semibold text-base-content">
              Who are you talking to?
            </h3>
            <p className="mt-1 text-body text-base-content/60">
              Each persona remembers differently — pick the one that fits the
              thread.
            </p>
          </div>
          <button
            className="btn btn-ghost btn-sm btn-circle"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-5">
          {loading ? (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton h-24 rounded-xl" />
              ))}
            </div>
          ) : error ? (
            <p className="rounded-xl border border-dashed border-base-300 p-4 text-helper text-base-content/60">
              Personas didn't load — you can still start with Mentor.
            </p>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {personas.map((persona) => (
                <button
                  key={persona.id}
                  onClick={() => onPick(persona)}
                  className="flex flex-col gap-1.5 rounded-xl border border-base-300 bg-base-100 p-3.5 text-left transition hover:border-primary/40 hover:bg-primary/5"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-body font-semibold text-base-content">
                      {persona.name}
                    </span>
                    <span className="badge badge-soft badge-xs font-mono tracking-wide">
                      {persona.default_memory_type}
                    </span>
                  </span>
                  <span className="text-helper leading-relaxed text-base-content/60">
                    {persona.description}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            className="btn btn-ghost btn-sm text-base-content/70"
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="btn btn-primary btn-sm" onClick={onSkip}>
            Start with Mentor
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>,
    document.body
  )
}