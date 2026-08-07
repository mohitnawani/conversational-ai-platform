import { useEffect } from 'react'
import { ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router'
import { useAppDispatch, useAppSelector } from '@/store'
import { createConversation, fetchPersonas } from '@/store/conversationsSlice'
import { MainLayout } from '@/components/layout/MainLayout'
import type { Conversation } from '@/types/conversation'

const QUICK_STARTS = [
  { label: 'Ask a research question', icon: '▥' },
  { label: 'Tutor me step by step', icon: '✎' },
  { label: 'Review my reasoning', icon: '⌁' },
]

/**
 * Dashboard — the "What's next" landing inside the app shell. Same sidebar,
 * quiet hero, one amber wash, no futuristic orbs.
 */
export function DashboardPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const user = useAppSelector((s) => s.auth.user)
  const { personas, personasStatus } = useAppSelector((s) => s.conversations)

  useEffect(() => {
    if (personasStatus === 'idle') {
      dispatch(fetchPersonas())
    }
  }, [personasStatus, dispatch])

  const modeName = personas[0]?.name.toUpperCase() ?? 'GENERAL'

  async function startConversation(persona?: string) {
    const res = await dispatch(createConversation({ persona: persona ?? personas[0]?.id }))
    if (res.meta.requestStatus === 'fulfilled') {
      navigate(`/chat/${(res.payload as Conversation).id}`)
    }
  }

  return (
    <MainLayout title="Mnemo">
      <main className="relative min-h-0 flex-1 overflow-y-auto">
        <div aria-hidden className="amber-wash pointer-events-none absolute inset-0" />
        <div className="relative flex min-h-full flex-col items-center justify-center px-6 py-16 text-center">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-amber-index">
            Your workspace
          </p>
          <h1 className="mt-4 font-display text-[32px] font-medium leading-[1.15] tracking-tight text-paper-100">
            What's next, {user?.name?.split(' ')[0] ?? 'friend'}?
          </h1>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.22em] text-amber-index">
            mode: {modeName}
          </p>
          <p className="mt-4 max-w-sm text-sm text-paper-500">
            Open a conversation to keep going, or start a new one — every reply
            stays bound to the sources it came from.
          </p>

          <div className="mt-7 flex max-w-lg flex-col items-stretch gap-2">
            {QUICK_STARTS.map((qs) => (
              <button
                key={qs.label}
                type="button"
                onClick={() => startConversation(personas[0]?.id)}
                className="group flex w-full items-center gap-3 rounded-lg border border-ink-700 bg-ink-800 px-4 py-2.5 text-left text-sm text-paper-100 transition-colors duration-[120ms] hover:border-amber-index"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-amber-tint font-mono text-[13px] text-amber-index">
                  {qs.icon}
                </span>
                <span className="flex-1">{qs.label}</span>
                <ArrowRight className="h-4 w-4 text-paper-500 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-amber-index" />
              </button>
            ))}
          </div>

          <p className="mt-8 font-mono text-[0.65rem] tracking-[0.18em] text-paper-500">
            INDEX: BUILDING · EVERY ANSWER, TRACEABLE
          </p>
        </div>
      </main>
    </MainLayout>
  )
}