import type { ReactNode } from 'react'
import { Archive } from 'lucide-react'
import DriftingChips, { type DriftChip } from './DriftingChips'

function BrandMark() {
  return (
    <span className="flex items-center gap-3">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-index text-ink-950 shadow-md shadow-black/30">
        <Archive className="h-5 w-5" strokeWidth={1.8} />
      </span>
      <span className="leading-none">
        <span className="block font-display text-xl font-medium tracking-tight text-paper-100">
          Mnemo
        </span>
        <span className="mt-1 block font-mono text-[0.65rem] tracking-wide text-paper-500">
          INDEX · RAG
        </span>
      </span>
    </span>
  )
}

function MobileBrandBar() {
  return (
    <header className="flex items-center gap-3 px-5 pt-6 lg:hidden">
      <BrandMark />
      <span className="ml-auto rounded-md border border-ink-700 bg-ink-800 px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-paper-500">
        traceable answers
      </span>
    </header>
  )
}

interface AuthStageProps {
  kicker: string
  headline: ReactNode
  tagline: string
  chips: DriftChip[]
  foot: string
  children?: ReactNode
}

/**
 * Left 60% brand stage for the auth pages. Replaces stock photography with the
 * product's own "index thread" motif — drifting catalog-card chips annotated
 * with mono citations. Dark-focused, one low-contrast amber wash, nothing else.
 */
export function AuthStage({ kicker, headline, tagline, chips, foot, children }: AuthStageProps) {
  return (
    <aside className="relative hidden overflow-hidden bg-ink-900 lg:flex lg:flex-col lg:justify-between lg:p-12">
      <div aria-hidden className="amber-wash pointer-events-none absolute inset-0" />

      <header className="relative z-10">
        <BrandMark />
      </header>

      <div className="relative z-10 max-w-lg py-10">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-amber-index">
          {kicker}
        </p>
        <h1 className="mt-4 font-display text-[44px] font-medium leading-[1.1] tracking-tight text-paper-100">
          {headline}
        </h1>
        <p className="mt-4 font-display text-lg italic font-normal text-paper-500">
          {tagline}
        </p>
        {children}
        <DriftingChips chips={chips} />
      </div>

      <p className="relative z-10 flex items-center justify-between font-mono text-[0.65rem] tracking-[0.18em] text-paper-500">
        <span>{foot}</span>
        <span className="tracking-[0.3em]">✦</span>
      </p>
    </aside>
  )
}

/** Split-screen shell for the auth pages (60% stage / 40% form). */
export function AuthShell({ stage, children }: { stage: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-h-svh bg-ink-950 lg:grid-cols-[3fr_2fr]">
      {stage}
      <main className="flex flex-col">
        <MobileBrandBar />
        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-[25rem]">{children}</div>
        </div>
        <p className="hidden pb-6 text-center font-mono text-[0.65rem] tracking-[0.18em] text-paper-500 lg:block">
          Mnemo · every answer, traceable
        </p>
      </main>
    </div>
  )
}