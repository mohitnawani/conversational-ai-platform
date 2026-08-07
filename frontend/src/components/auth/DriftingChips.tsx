import { Plus } from 'lucide-react'

export interface DriftChip {
  label: string
  /** mono numeral slot at the chip's edge, e.g. "1" */
  ref?: string
  left: string
  delay: number
  duration: number
  /** upload-style chip (amber + square) instead of a citation card */
  upload?: boolean
}

/**
 * The drifting "index tab" chips on the auth stage. Each chip is a catalog
 * card: a thin amber thread sliver + mono index numeral + mono label, slowly
 * drifting upward on a loop. Purely decorative text — is hidden from AT and
 * disabled under prefers-reduced-motion (see index.css).
 */
export function IndexChip({ chip }: { chip: DriftChip }) {
  if (chip.upload) {
    return (
      <span className="inline-flex items-center gap-2.5 rounded-lg border border-ink-700 bg-ink-800 p-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-index text-ink-950">
          <Plus size={14} strokeWidth={2.5} />
        </span>
        <span className="font-mono text-[11px] text-paper-100">{chip.label}</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-2.5 rounded-lg border border-ink-700 bg-ink-800 px-3 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
      <span className="h-5 w-[3px] shrink-0 rounded-[1px] bg-amber-index" aria-hidden />
      {chip.ref && <span className="font-mono text-[10px] text-amber-index">[{chip.ref}]</span>}
      <span className="font-mono text-[11px] text-paper-100">{chip.label}</span>
    </span>
  )
}

export default function DriftingChips({ chips }: { chips: DriftChip[] }) {
  return (
    <div className="relative mt-10 h-44" aria-hidden>
      {chips.map((chip) => (
        <div
          key={chip.label}
          className="absolute animate-drift will-change-transform"
          style={{
            left: chip.left,
            animationDelay: `${chip.delay}s`,
            animationDuration: `${chip.duration}s`,
          }}
        >
          <IndexChip chip={chip} />
        </div>
      ))}
    </div>
  )
}