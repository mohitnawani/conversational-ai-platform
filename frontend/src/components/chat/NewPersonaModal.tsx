import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { CUSTOM_EVENT, PERSONA_ICONS, saveCustomPersona } from './personas'

/**
 * Plain modal for a custom persona: name + system instructions + a simple
 * icon picker. Persists to localStorage — no backend required.
 */
export function NewPersonaModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [system, setSystem] = useState('')
  const [iconIdx, setIconIdx] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    const trimmed = name.trim()
    if (!trimmed) return
    setSaving(true)
    setError(null)
    try {
      await saveCustomPersona({ name: trimmed, system: system.trim(), icon: iconIdx })
      window.dispatchEvent(new Event(CUSTOM_EVENT))
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create persona')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="New persona"
    >
      <button
        aria-label="Close dialog"
        className="absolute inset-0 cursor-default bg-black/50"
        onClick={onClose}
      />
      <div className="stagger relative my-auto max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-xl border border-ink-700 bg-ink-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-medium text-paper-100">New persona</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-paper-500 transition-colors duration-[120ms] hover:bg-ink-800 hover:text-paper-100"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="np-name" className="mb-1.5 block text-[13px] font-medium text-paper-500">
              Name
            </label>
            <input
              id="np-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Legal Drafter"
              className="w-full rounded-lg border border-ink-700 bg-ink-800 px-3 py-2 text-sm text-paper-100 outline-none transition-colors duration-150 placeholder:text-paper-500/45 focus:border-amber-index focus:shadow-[0_0_0_3px_rgba(217,164,65,0.15)]"
            />
          </div>
          <div>
            <label htmlFor="np-system" className="mb-1.5 block text-[13px] font-medium text-paper-500">
              System instructions
            </label>
            <textarea
              id="np-system"
              value={system}
              onChange={(e) => setSystem(e.target.value)}
              rows={3}
              placeholder="How should this persona behave, argue, and cite?"
              className="w-full resize-none rounded-lg border border-ink-700 bg-ink-800 px-3 py-2 text-sm text-paper-100 outline-none transition-colors duration-150 placeholder:text-paper-500/45 focus:border-amber-index focus:shadow-[0_0_0_3px_rgba(217,164,65,0.15)]"
            />
          </div>
          <div>
            <span className="mb-1.5 block text-[13px] font-medium text-paper-500">Icon</span>
            <div className="flex gap-2">
              {PERSONA_ICONS.map((Icon, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIconIdx(i)}
                  aria-label={`Icon option ${i + 1}`}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors duration-[120ms] ${
                    i === iconIdx
                      ? 'border-amber-index bg-amber-index text-ink-950'
                      : 'border-ink-700 bg-ink-800 text-paper-500 hover:text-paper-100'
                  }`}
                >
                  <Icon size={15} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          {error && <p role="alert" className="mr-auto text-xs text-red-danger">{error}</p>}
          <button
            type="button"
            onClick={save}
            disabled={!name.trim() || saving}
            className="ml-auto rounded-lg bg-amber-index px-4 py-2 text-sm font-medium text-ink-950 transition-colors duration-150 hover:bg-amber-index-deep disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create persona'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
