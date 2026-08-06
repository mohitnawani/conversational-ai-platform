import { useState } from 'react'
import { MessageSquarePlus, RotateCcw, Search, Trash2 } from 'lucide-react'
import type { Conversation } from '@/types/conversation'
import { ChatItem } from '@/components/dashboard/ChatItem'

interface ChatListProps {
  chats: Conversation[]
  activeId: string | null
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  onOpen: (chat: Conversation) => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
  onRetry: () => void
}

export function ChatList({
  chats,
  activeId,
  status,
  onOpen,
  onRename,
  onDelete,
  onRetry,
}: ChatListProps) {
  const [query, setQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null)

  const filtered = query.trim()
    ? chats.filter((c) => c.title.toLowerCase().includes(query.trim().toLowerCase()))
    : chats

  return (
    <div className="flex flex-1 flex-col gap-2">
      {chats.length > 0 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-base-content/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats…"
            aria-label="Search chats"
            className="input input-sm w-full border-base-300 bg-base-200/60 pl-9 text-input placeholder:text-base-content/35 focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto pr-1">
        {status === 'loading' ? (
          <ul className="space-y-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="skeleton h-14 rounded-xl" />
            ))}
          </ul>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-base-300 px-4 py-8 text-center">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
              <MessageSquarePlus className="h-4 w-4" />
            </span>
            <p className="text-body font-medium text-base-content">
              {chats.length === 0 ? 'No conversations yet' : 'No matches'}
            </p>
            <p className="text-helper text-base-content/50">
              {chats.length === 0
                ? 'Start one — Mnemo will keep the whole thread for you.'
                : 'Try a different title.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {filtered.map((chat) => (
              <ChatItem
                key={chat.id}
                chat={chat}
                active={chat.id === activeId}
                onOpen={onOpen}
                onRename={onRename}
                onDeleteRequest={setDeleteTarget}
              />
            ))}
          </ul>
        )}

        {status === 'failed' && (
          <button
            className="btn btn-ghost btn-sm mt-2 w-full gap-2 text-base-content/70"
            onClick={onRetry}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Couldn't load — retry
          </button>
        )}
      </div>

      {deleteTarget && (
        <div className="modal modal-open" role="dialog" aria-modal="true" aria-label="Delete chat">
          <div className="modal-box max-w-sm bg-base-100 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-heading font-semibold text-base-content">
                  Delete this chat?
                </h3>
                <p className="mt-1 text-body text-base-content/60">
                  “{deleteTarget.title}” and its full history will be removed.
                  This can't be undone.
                </p>
              </div>
              <button
                className="btn btn-ghost btn-sm btn-circle"
                onClick={() => setDeleteTarget(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                className="btn btn-ghost btn-sm text-base-content/70"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-error btn-sm gap-1.5"
                onClick={() => {
                  onDelete(deleteTarget.id)
                  setDeleteTarget(null)
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setDeleteTarget(null)} />
        </div>
      )}
    </div>
  )
}
