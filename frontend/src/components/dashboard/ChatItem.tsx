import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Check, MoreVertical, Pencil, Trash2, X } from 'lucide-react'
import type { Conversation, Persona } from '@/types/conversation'
import { formatChatTime } from '@/lib/time'

interface ChatItemProps {
  chat: Conversation
  persona?: Persona
  active: boolean
  onOpen: (chat: Conversation) => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
}

/**
 * Chat row: quiet by default (title + mono meta), a ⋮ menu on hover with
 * Rename / Delete. Delete swaps the row inline into a red confirm —
 * no native confirm, no modal over the whole screen.
 */
export function ChatItem({ chat, persona, active, onOpen, onRename, onDelete }: ChatItemProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(chat.title)
  const [confirming, setConfirming] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  useEffect(() => {
    if (!menuOpen) return
    function onPointerDown(e: PointerEvent) {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  function startRename() {
    setMenuOpen(false)
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
      {confirming ? (
        <div className="flex items-center gap-1.5 rounded-md border border-red-danger/40 bg-red-tint px-3 py-2">
          <span className="flex-1 truncate text-xs text-red-danger">Delete this chat?</span>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded px-2 py-1 text-xs text-paper-500 transition-colors duration-[120ms] hover:text-paper-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirming(false)
              onDelete(chat.id)
            }}
            className="rounded bg-red-danger px-2 py-1 text-xs font-medium text-paper-100 transition-colors duration-[120ms] hover:bg-red-danger/85"
          >
            Delete
          </button>
        </div>
      ) : editing ? (
        <div className="flex items-center gap-1 px-2 py-1.5">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={saveRename}
            onKeyDown={handleKeyDown}
            aria-label={`Rename ${chat.title}`}
            className="min-w-0 flex-1 rounded border border-amber-index bg-ink-950 px-2 py-1 text-xs text-paper-100 outline-none"
          />
          <button
            type="button"
            onClick={saveRename}
            aria-label="Save rename"
            className="p-1 text-amber-index transition-colors duration-[120ms] hover:text-amber-index-deep"
          >
            <Check size={14} />
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            aria-label="Cancel rename"
            className="p-1 text-paper-500 transition-colors duration-[120ms] hover:text-paper-100"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div
          ref={menuRef}
          className={`relative rounded-md transition-colors duration-[120ms] ${
            active ? 'bg-ink-800 shadow-[inset_2px_0_0_0_var(--amber-index)]' : 'hover:bg-ink-800/60'
          }`}
        >
          <div
            role="button"
            tabIndex={0}
            onClick={() => onOpen(chat)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onOpen(chat)
              }
            }}
            className="group flex cursor-pointer items-center gap-1 px-3 py-2"
          >
            <span className="min-w-0 flex-1">
              <span
                title={chat.title}
                className={`block truncate text-[13px] transition-colors duration-[120ms] ${
                  active ? 'text-paper-100' : 'text-paper-500 group-hover:text-paper-100'
                }`}
              >
                {chat.title}
              </span>
              <span className="mt-0.5 block truncate font-mono text-[0.65rem] tracking-wide text-paper-500/80">
                {persona ? persona.name.toUpperCase() : 'CHAT'} · {chat.message_count}{' '}
                MSG · CREATED {formatChatTime(chat.created_at)} · REPLIED{' '}
                {formatChatTime(chat.updated_at)}
              </span>
            </span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen((v) => !v)
              }}
              aria-label="Chat actions"
              aria-expanded={menuOpen}
              className={`rounded p-1 text-paper-500 transition-colors duration-[120ms] hover:text-paper-100 ${
                menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
            >
              <MoreVertical size={14} />
            </button>

            {menuOpen && (
              <div
                className="absolute right-2 top-full z-40 mt-1 w-36 animate-tag rounded-lg border border-ink-700 bg-ink-800 py-1 shadow-xl"
                role="menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={startRename}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-paper-100 transition-colors duration-[120ms] hover:bg-ink-700"
                >
                  <Pencil size={12} /> Rename
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    setConfirming(true)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-danger transition-colors duration-[120ms] hover:bg-ink-700"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </li>
  )
}