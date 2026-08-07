import { useMemo, useState } from 'react'
import { MessageSquarePlus, RotateCcw, Search } from 'lucide-react'
import type { Conversation, Persona } from '@/types/conversation'
import { ChatItem } from '@/components/dashboard/ChatItem'

interface ChatListProps {
  chats: Conversation[]
  personas: Persona[]
  activeId: string | null
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  onOpen: (chat: Conversation) => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
  onRetry: () => void
}

const GROUP_ORDER = ['Today', 'Yesterday', 'Previous 7 days', 'Older'] as const
type Group = (typeof GROUP_ORDER)[number]

function groupOf(iso: string): Group {
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.floor((startOfDay(new Date()) - startOfDay(new Date(iso))) / 86400000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days <= 7) return 'Previous 7 days'
  return 'Older'
}

/**
 * Chat list grouped by relative date (Today / Yesterday / Previous 7 days /
 * Older). Search filters titles; mono placeholder, amber focus ring.
 */
export function ChatList({
  chats,
  personas,
  activeId,
  status,
  onOpen,
  onRename,
  onDelete,
  onRetry,
}: ChatListProps) {
  const [query, setQuery] = useState('')

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? chats.filter((c) => c.title.toLowerCase().includes(q))
      : chats
    const map = new Map<Group, Conversation[]>()
    for (const g of GROUP_ORDER) map.set(g, [])
    for (const chat of filtered) {
      map.get(groupOf(chat.updated_at))?.push(chat)
    }
    return GROUP_ORDER.filter((g) => (map.get(g)?.length ?? 0) > 0).map((g) => ({
      name: g,
      chats: map.get(g) ?? [],
    }))
  }, [chats, query])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {chats.length > 0 && (
        <div className="px-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-paper-500"
              aria-hidden
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="search chats…"
              aria-label="Search chats"
              className="w-full rounded-lg border border-ink-700 bg-ink-800 py-2 pl-8 pr-3 font-mono text-xs text-paper-100 outline-none transition-colors duration-150 placeholder:text-paper-500/50 focus:border-amber-index focus:shadow-[0_0_0_3px_rgba(217,164,65,0.15)]"
            />
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {status === 'loading' ? (
          <div className="space-y-1.5 px-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-lg bg-ink-800/60"
                aria-hidden
              />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-ink-700 px-4 py-8 text-center">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-amber-tint text-amber-index">
              <MessageSquarePlus className="h-4 w-4" />
            </span>
            <p className="text-sm font-medium text-paper-100">
              {chats.length === 0 ? 'No conversations yet' : 'No matches'}
            </p>
            <p className="text-xs text-paper-500">
              {chats.length === 0
                ? 'Start one — every reply will stay bound to its sources.'
                : 'Try a different title.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {groups.map((group) => (
              <li key={group.name}>
                <p className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-paper-500">
                  {group.name}
                </p>
                <ul className="space-y-0.5">
                  {group.chats.map((chat) => (
                    <ChatItem
                      key={chat.id}
                      chat={chat}
                      persona={personas.find((p) => p.id === chat.persona)}
                      active={chat.id === activeId}
                      onOpen={onOpen}
                      onRename={onRename}
                      onDelete={onDelete}
                    />
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}

        {status === 'failed' && (
          <button
            type="button"
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs text-paper-500 transition-colors duration-[120ms] hover:text-paper-100"
            onClick={onRetry}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Couldn't load — retry
          </button>
        )}
      </div>
    </div>
  )
}