import type { ReactNode } from 'react'
import { useLocation } from 'react-router'
import { BrainCircuit, Lock, Network } from 'lucide-react'

const FEATURES = [
  {
    icon: Network,
    title: 'Knowledge graph',
    body: 'Entities woven together — context the AI actually uses.',
  },
  {
    icon: Lock,
    title: 'Private workspace',
    body: 'Your threads stay inside your own space. Always.',
  },
]

export function AuthShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()

  return (
    <div className="min-h-svh bg-base-200 lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
      <BrandPanel />
      <section className="flex flex-col">
        <MobileBrandBar />
        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
          <main key={pathname} className="w-full max-w-[25rem]">
            {children}
          </main>
        </div>
        <p className="hidden pb-6 text-center font-mono text-[0.7rem] tracking-wide text-base-content/50 lg:block">
          Mnemo · your conversations, kept
        </p>
      </section>
    </div>
  )
}

function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden border-r border-base-content/10 bg-base-300 lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-graph [mask-image:linear-gradient(to_bottom,black,transparent_95%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-3xl"
      />

      <header className="relative z-10 flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-content shadow-md shadow-primary/30">
          <BrainCircuit className="h-5 w-5" />
        </span>
        <span>
          <span className="block font-display text-xl font-semibold tracking-tight text-base-content">
            Mnemo
          </span>
          <span className="block font-mono text-[0.65rem] tracking-wide text-base-content/50">
            /meh·moh
          </span>
        </span>
      </header>

      <div className="relative z-10 max-w-md space-y-9 py-12">
        <p className="font-mono text-eyebrow uppercase text-primary">
          <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle" />
          Memory-first ai
        </p>
        <h1 className="font-display text-hero font-semibold tracking-tight text-base-content xl:text-[2.9rem]">
          Conversations that{' '}
          <em className="font-semibold not-italic text-primary">
            remember
          </em>{' '}
          where you left off.
        </h1>

        <ul className="space-y-4">
          {FEATURES.map((feature) => (
            <li key={feature.title} className="flex items-start gap-3.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                <feature.icon className="h-4 w-4" />
              </span>
              <span>
                <strong className="block text-body font-semibold text-base-content">
                  {feature.title}
                </strong>
                <span className="block text-body text-base-content/60">
                  {feature.body}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative z-10 px-2">
        <MemoryGraph />
      </div>
    </aside>
  )
}

function MobileBrandBar() {
  return (
    <header className="flex items-center gap-3 px-5 pt-6 lg:hidden">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-content shadow-md shadow-primary/30">
        <BrainCircuit className="h-5 w-5" />
      </span>
      <div>
        <p className="font-display text-lg font-semibold tracking-tight text-base-content">
          Mnemo
        </p>
        <p className="font-mono text-[0.7rem] tracking-wide text-base-content/50">
          /meh·moh · conversations with a memory
        </p>
      </div>
      <span className="badge badge-outline ml-auto gap-1.5 border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-eyebrow uppercase text-primary">
        <span className="badge badge-primary badge-xs" />
        Remembers
      </span>
    </header>
  )
}

function MemoryGraph() {
  return (
    <div className="relative h-44">
      <div
        aria-hidden
        className="absolute inset-x-0 top-1/2 border-t-2 border-dashed border-base-content/15"
      />
      <div
        aria-hidden
        className="absolute inset-x-[10%] top-[24%] border-t border-dashed border-base-content/10 -rotate-6"
      />

      <span aria-hidden className="absolute left-[10%] top-[20%] h-2 w-2 rounded-full bg-secondary" />
      <span aria-hidden className="absolute left-[38%] top-[72%] h-2 w-2 rounded-full bg-primary/60" />
      <span aria-hidden className="absolute left-[64%] top-[18%] h-2 w-2 rounded-full bg-secondary" />
      <span aria-hidden className="absolute left-[88%] top-[62%] h-2 w-2 rounded-full bg-primary/60" />

      <span className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2">
        <span className="block h-3.5 w-3.5 rounded-full bg-primary shadow-md shadow-primary/40" />
        <span
          aria-hidden
          className="absolute -inset-2 animate-pulse rounded-full border-2 border-primary/30"
        />
      </span>

      <span className="absolute left-[10%] top-[32%] -translate-x-1/2 whitespace-nowrap font-mono text-[0.65rem] tracking-wide text-base-content/60">
        MAYA
      </span>
      <span className="absolute left-[38%] top-[84%] -translate-x-1/2 whitespace-nowrap font-mono text-[0.65rem] tracking-wide text-base-content/60">
        FACTS
      </span>
      <span className="absolute left-[50%] top-[62%] -translate-x-1/2 whitespace-nowrap font-mono text-[0.65rem] tracking-wide text-base-content/60">
        YOU
      </span>
      <span className="absolute left-[88%] top-[74%] -translate-x-1/2 whitespace-nowrap font-mono text-[0.65rem] tracking-wide text-base-content/60">
        IDEA
      </span>

      <p className="absolute inset-x-0 bottom-0 flex items-center justify-between font-mono text-[0.65rem] tracking-wide text-base-content/45">
        <span>RECALLED 4H AGO</span>
        <span>GRAPH: PERSISTED</span>
      </p>
    </div>
  )
}
