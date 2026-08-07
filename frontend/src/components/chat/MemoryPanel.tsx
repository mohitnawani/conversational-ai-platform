import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import type {
  GraphEdge,
  GraphNode,
  MemoryEntity,
  MemoryInsights,
} from '@/types/conversation'

const VIEW_W = 440
const VIEW_H = 300

const TAB_LABELS = ['entities', 'graph', 'summary', 'tokens'] as const
type Tab = (typeof TAB_LABELS)[number]

const MEMORY_LABELS: Record<string, string> = {
  buffer: 'Buffer',
  summary: 'Summary',
  entity: 'Entity',
  kg: 'Knowledge graph',
  hybrid: 'Hybrid',
}

function formatDate(iso?: string) {
  if (!iso) return null
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/* ------------------------------------------------------------------ */
/*  Force layout — tiny deterministic simulation, no graph library.    */
/* ------------------------------------------------------------------ */

function forceLayout(nodes: GraphNode[], edges: GraphEdge[]) {
  const n = nodes.length
  if (n === 0) return []
  const pos = nodes.map((_, i) => {
    const ang = (i / n) * Math.PI * 2
    const r = Math.min(VIEW_W, VIEW_H) * 0.3
    return {
      x: VIEW_W / 2 + r * Math.cos(ang) + (Math.random() - 0.5) * 60,
      y: VIEW_H / 2 + r * Math.sin(ang) + (Math.random() - 0.5) * 60,
      vx: 0,
      vy: 0,
    }
  })
  const idx = new Map(nodes.map((nd, i) => [nd.id, i]))

  for (let k = 0; k < 240; k++) {
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = pos[j].x - pos[i].x
        const dy = pos[j].y - pos[i].y
        const d2 = Math.max(dx * dx + dy * dy, 4)
        const d = Math.sqrt(d2)
        const f = 2600 / d2
        pos[i].vx -= (dx / d) * f
        pos[i].vy -= (dy / d) * f
        pos[j].vx += (dx / d) * f
        pos[j].vy += (dy / d) * f
      }
    }
    for (const e of edges) {
      const si = idx.get(e.source)
      const ti = idx.get(e.target)
      if (si == null || ti == null) continue
      const dx = pos[ti].x - pos[si].x
      const dy = pos[ti].y - pos[si].y
      const d = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
      const strength = (0.06 * (d - 110)) / d
      pos[si].vx += dx * strength
      pos[si].vy += dy * strength
      pos[ti].vx -= dx * strength
      pos[ti].vy -= dy * strength
    }
    for (const p of pos) {
      p.vx += (VIEW_W / 2 - p.x) * 0.012
      p.vy += (VIEW_H / 2 - p.y) * 0.012
      p.vx *= 0.85
      p.vy *= 0.85
      p.x += p.vx
      p.y += p.vy
    }
  }
  return pos
}

function GraphView({ nodes, edges }: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  const pos = useMemo(() => forceLayout(nodes, edges), [nodes, edges])
  if (nodes.length === 0) {
    return (
      <p className="px-2 py-10 text-center text-sm text-paper-500">
        No relationships extracted yet. Switch memory to “Knowledge graph” and
        keep talking.
      </p>
    )
  }
  const byId = new Map(nodes.map((nd, i) => [nd.id, pos[i]]))
  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="img"
      aria-label="Knowledge graph of extracted relationships"
      className="h-auto w-full"
    >
      {edges.map((e, _i) => {
        const s = byId.get(e.source)
        const t = byId.get(e.target)
        if (!s || !t) return null
        return (
          <line
            key={_i}
            x1={s.x}
            y1={s.y}
            x2={t.x}
            y2={t.y}
            stroke="var(--paper-500)"
            strokeOpacity={0.35}
            strokeWidth={1}
          >
            <title>{e.predicate}</title>
          </line>
        )
      })}
      {nodes.map((nd) => {
        const p = byId.get(nd.id)
        if (!p) return null
        return (
          <g key={nd.id}>
            <circle
              cx={p.x}
              cy={p.y}
              r={7}
              fill="var(--amber-index)"
              stroke="var(--ink-950)"
              strokeWidth={2}
            />
            <text
              x={p.x}
              y={p.y + 20}
              textAnchor="middle"
              className="font-mono"
              fontSize={10}
              fill="var(--paper-500)"
            >
              {nd.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Tabs                                                               */
/* ------------------------------------------------------------------ */

function EntitiesTab({ entities }: { entities: MemoryEntity[] }) {
  if (entities.length === 0) {
    return (
      <p className="px-2 py-10 text-center text-sm text-paper-500">
        No entities tracked yet — the entity memory will build as you talk.
      </p>
    )
  }
  return (
    <div className="space-y-2">
      {entities.map((e) => (
        <div
          key={e.id}
          className="rounded-lg border border-ink-700 bg-ink-800 p-3 transition-colors duration-[120ms] hover:border-ink-700/80"
        >
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-[2px] rounded-full bg-amber-index" aria-hidden />
            <p className="flex-1 truncate text-[13px] text-paper-100">{e.name}</p>
            <p className="shrink-0 rounded-[4px] bg-amber-tint px-1.5 py-px font-mono text-[9px] uppercase tracking-wider text-amber-index">
              {e.type}
            </p>
          </div>
          {e.description && (
            <p className="mt-1.5 pl-[10px] text-xs leading-relaxed text-paper-500">
              {e.description}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

function TokensTab({ tokens }: { tokens: MemoryInsights['tokens'] }) {
  const total = Math.max(tokens.total, 1)
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-ink-700 bg-ink-800 p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper-500">
          Tokens in this thread
        </p>
        <p className="mt-1 font-display text-4xl font-medium text-paper-100">
          {tokens.total.toLocaleString()}
        </p>
        <p className="mt-1 font-mono text-[10px] text-paper-500">
          {tokens.messages} message{tokens.messages === 1 ? '' : 's'}
        </p>
      </div>
      <div className="space-y-3">
        {[
          { label: 'You', value: tokens.user, color: 'bg-amber-index' },
          { label: 'Assistant', value: tokens.assistant, color: 'bg-paper-500' },
        ].map((row) => (
          <div key={row.label}>
            <div className="flex items-baseline justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper-500">
                {row.label}
              </p>
              <p className="font-mono text-[11px] text-paper-100">
                {row.value.toLocaleString()}
              </p>
            </div>
            <div className="mt-1.5 h-1 rounded-full bg-ink-700">
              <div
                className={`h-1 rounded-full ${row.color}`}
                style={{ width: `${(row.value / total) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SummaryTab({ summary }: { summary: MemoryInsights['summary'] }) {
  if (!summary) {
    return (
      <p className="px-2 py-10 text-center text-sm text-paper-500">
        No summary yet — it is written every five messages under summary or
        hybrid memory.
      </p>
    )
  }
  return (
    <div className="space-y-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper-500">
        Rolling summary
        <span className="ml-2 text-amber-index">{formatDate(summary.created_at)}</span>
      </p>
      <p className="text-[13px] leading-relaxed text-paper-100">{summary.text}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */

interface MemoryPanelProps {
  open: boolean
  memory: MemoryInsights | null
  loading: boolean
  error: string | null
  onClose: () => void
  onRetry: () => void
  /** effective memory type of the active persona (override or persona default) */
  memoryType: string
  /** name of the tuned persona, for the "Default" option label */
  defaultMemoryLabel: string
  /** null = reset to the persona default */
  onMemoryTypeChange: (memoryType: string | null) => void
}

export function MemoryPanel({
  open,
  memory,
  loading,
  error,
  onClose,
  onRetry,
  memoryType,
  defaultMemoryLabel,
  onMemoryTypeChange,
}: MemoryPanelProps) {
  const [tab, setTab] = useState<Tab>('entities')

  if (!open) return null

  return (
    <>
      <button
        aria-label="Close memory panel"
        className="absolute inset-0 z-20 lg:hidden"
        onClick={onClose}
      />
      <aside
        aria-label="Memory inspector"
        className="animate-drawer-in absolute inset-y-0 right-0 z-30 flex w-[min(360px,92vw)] flex-col border-l border-ink-700 bg-ink-900 max-lg:inset-x-0 max-lg:inset-y-auto max-lg:bottom-0 max-lg:max-h-[75%] max-lg:w-auto max-lg:animate-sheet-up max-lg:border-l-0 max-lg:border-t"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-ink-700 px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper-500">
            Memory index
          </p>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper-500">
                Mode
              </span>
              <select
                value={memoryType}
                onChange={(e) =>
                  onMemoryTypeChange(e.target.value === 'default' ? null : e.target.value)
                }
                aria-label="Memory type"
                className="rounded-[4px] border border-ink-700 bg-ink-800 px-1.5 py-1 font-mono text-[10px] text-amber-index transition-colors duration-[120ms] hover:border-amber-index focus:border-amber-index focus:outline-none"
              >
                <option value="default">Default · {defaultMemoryLabel}</option>
                {Object.entries(MEMORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close memory panel"
              className="rounded-md p-1.5 text-paper-500 transition-colors duration-[120ms] hover:bg-ink-800 hover:text-paper-100"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        <nav
          aria-label="Memory views"
          className="flex shrink-0 items-center gap-1 border-b border-ink-700 px-3 py-2"
        >
          {TAB_LABELS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`relative rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors duration-[120ms] ${
                tab === t ? 'bg-amber-index text-ink-950' : 'text-paper-500 hover:text-paper-100'
              }`}
            >
              {t}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <span
                aria-hidden
                className="h-5 w-5 animate-spin rounded-full border-2 border-ink-700 border-t-amber-index"
              />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <p className="text-sm text-paper-500">{error}</p>
              <button
                type="button"
                onClick={onRetry}
                className="rounded-lg border border-ink-700 px-3 py-1.5 text-xs text-paper-500 transition-colors duration-[120ms] hover:border-amber-index hover:text-amber-index"
              >
                Retry
              </button>
            </div>
          ) : !memory ? (
            <p className="px-2 py-10 text-center text-sm text-paper-500">
              Memory isn't available for this thread yet.
            </p>
          ) : tab === 'entities' ? (
            <EntitiesTab entities={memory.entities} />
          ) : tab === 'graph' ? (
            <GraphView nodes={memory.graph.nodes} edges={memory.graph.edges} />
          ) : tab === 'summary' ? (
            <SummaryTab summary={memory.summary} />
          ) : (
            <TokensTab tokens={memory.tokens} />
          )}
        </div>
      </aside>
    </>
  )
}
