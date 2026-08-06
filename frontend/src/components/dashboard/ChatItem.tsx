import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { MoreHorizontal } from 'lucide-react'
import type { Conversation } from '@/types/conversation'
import { timeAgo } from '@/lib/time'

interface ChatItemProps {
  chat: Conversation
  active: boolean
  onOpen: (chat: Conversation) => void
  onRename: (id: string, title: string) => void
  onDeleteRequest: (chat: Conversation) => void
}

export function ChatItem({ chat, active, onOpen, onRename, onDeleteRequest }: ChatItemProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(chat.title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  function startRename() {
    setDraft(chat.title)
    setEditing(true)
  }

  function saveRename() {
    const title = draft.trim()
    setEditing(false)
    if (title && title !== chat.title) {
      onRename(chat.id, title)
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') saveRename()
    if (e.key === 'Escape') setEditing(false)
  }

  return (
    <li>
      <div
        className={`group relative flex w-full items-center gap-1 rounded-xl border p-2 pr-1 transition ${
          active
            ? 'border-base-300 bg-base-300'
            : 'border-transparent hover:bg-base-200'
        }`}
      >
        <button
          type="button"
          onClick={() => onOpen(chat)}
          className="min-w-0 flex-1 rounded-lg px-1.5 py-1 text-left"
        >
          {editing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={saveRename}
              onKeyDown={handleKeyDown}
              aria-label={`Rename ${chat.title}`}
              className="input input-sm w-full border-base-300 bg-base-100 text-input"
            />
          ) : (
            <span
              title={chat.title}
              className={`block truncate text-body font-medium ${
                active ? 'text-base-content' : 'text-base-content'
              }`}
            >
              {chat.title}
            </span>
          )}
          <span className="mt-0.5 block truncate font-mono text-[0.7rem] tracking-wide text-base-content/50">
            {chat.message_count} MSG · {timeAgo(chat.updated_at).toUpperCase()}
          </span>
        </button>

        {!editing && (
          <div className="dropdown dropdown-end">
            <div
              tabIndex={0}
              role="button"
              aria-label={`Options for ${chat.title}`}
              className="btn btn-ghost btn-xs btn-square opacity-0 transition focus:opacity-100 group-hover:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </div>
            <ul
              tabIndex={0}
              className="dropdown-content menu menu-sm z-50 mt-1 w-36 rounded-lg bg-base-100 p-1 shadow-lg ring-1 ring-base-300"
            >
              <li>
                <button type="button" onClick={startRename}>
                  Rename
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onDeleteRequest(chat)}>
                  Delete
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
    </li>
  )
}
