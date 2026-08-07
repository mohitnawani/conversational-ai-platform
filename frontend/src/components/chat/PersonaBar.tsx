import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import type { Persona } from '@/types/conversation'
import {
  CUSTOM_EVENT,
  getCustomPersonas,
  personaIcon,
  PERSONA_ICONS,
  type CustomPersona,
} from './personas'
import { NewPersonaModal } from './NewPersonaModal'

interface PersonaBarProps {
  /** backend personas (fixed list from the API) */
  personas: Persona[]
  activeId?: string | null
  onSelect: (id: string) => void
}

interface Chip {
  id: string
  name: string
  icon: number
  custom: boolean
}

/**
 * Sticky persona switch above the chat window. Active pill slides with a
 * shared-layout transition (~200ms). Horizontally scrollable on mobile with
 * a soft edge fade; "+ New persona" opens a plain modal.
 */
export function PersonaBar({ personas, activeId, onSelect }: PersonaBarProps) {
  const barRef = useRef<HTMLDivElement>(null)
  const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })
  const [showNewModal, setShowNewModal] = useState(false)
  const [custom, setCustom] = useState<CustomPersona[]>([])

  const chips: Chip[] = [
    ...personas.map((p) => ({ id: p.id, name: p.name, icon: 0, custom: false })),
    ...custom.map((c) => ({ id: c.id, name: c.name, icon: c.icon, custom: true })),
  ]

  const active = chips.some((c) => c.id === activeId)
    ? (activeId as string)
    : (chips[0]?.id ?? '')

  const measure = useCallback(() => {
    const bar = barRef.current
    const chip = active ? chipRefs.current[active] : null
    if (!bar || !chip) return
    const barRect = bar.getBoundingClientRect()
    const chipRect = chip.getBoundingClientRect()
    setIndicator({
      left: chipRect.left - barRect.left,
      width: chipRect.width,
    })
  }, [active])

  useLayoutEffect(() => {
    measure()
  }, [measure, custom.length, personas.length])

  useEffect(() => {
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  useEffect(() => {
    const load = () => setCustom(getCustomPersonas())
    load()
    window.addEventListener(CUSTOM_EVENT, load)
    return () => window.removeEventListener(CUSTOM_EVENT, load)
  }, [])

  if (chips.length === 0) return null

  return (
    <div className="shrink-0 border-b border-ink-700 bg-ink-900/60 backdrop-blur-sm">
      <div className="flex items-end gap-4 px-3 py-2 sm:px-5">
        <div
          ref={barRef}
          role="tablist"
          aria-label="Assistant personas"
          className="fade-x-r relative flex items-center gap-1.5 overflow-x-auto px-1 py-1"
        >
          <span
            aria-hidden
            className="absolute bottom-1 top-1 rounded-full bg-amber-index transition-[left,width] duration-200 ease-out"
            style={{ left: indicator.left, width: indicator.width }}
          />
          {chips.map((chip) => {
            const isActive = chip.id === active
            const Icon = chip.custom ? PERSONA_ICONS[chip.icon] : personaIcon(chip.id)
            return (
              <button
                key={chip.id}
                ref={(el) => {
                  chipRefs.current[chip.id] = el
                }}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelect(chip.id)}
                className={`relative z-10 flex items-center gap-2 whitespace-nowrap rounded-full py-1.5 pl-3 pr-4 text-[13px] font-medium transition-colors duration-[120ms] ${
                  isActive ? 'text-ink-950' : 'text-paper-500 hover:text-paper-100'
                }`}
              >
                <Icon size={14} strokeWidth={isActive ? 2.2 : 1.8} />
                {chip.name}
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="relative z-10 flex items-center gap-2 whitespace-nowrap rounded-full border border-dashed border-ink-700 px-3.5 py-1.5 text-[13px] text-paper-500 transition-colors duration-[120ms] hover:border-amber-index hover:text-amber-index"
            aria-label="Add a new persona"
          >
            <Plus size={14} />
            New persona
          </button>
        </div>
      </div>
      {showNewModal && <NewPersonaModal onClose={() => setShowNewModal(false)} />}
    </div>
  )
}