import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Archive, ChevronDown, LogOut } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store'
import {
  createConversation,
  deleteConversation,
  fetchConversations,
  fetchPersonas,
  renameConversation,
  selectConversation,
} from '@/store/conversationsSlice'
import { logout } from '@/store/authSlice'
import { NewChatButton } from '@/components/dashboard/NewChatButton'
import { ChatList } from '@/components/dashboard/ChatList'
import { PersonaPickerModal } from '@/components/dashboard/PersonaPickerModal'
import type { Conversation, Persona } from '@/types/conversation'

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

interface AppSidebarProps {
  /** called after selecting/creating a chat so the mobile overlay closes */
  onNavigate?: () => void
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { conversations, selectedId, status, creating, personas, personasStatus } =
    useAppSelector((s) => s.conversations)
  const user = useAppSelector((s) => s.auth.user)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!accountOpen) return
    function onPointerDown(e: PointerEvent) {
      if (!accountRef.current?.contains(e.target as Node)) {
        setAccountOpen(false)
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setAccountOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [accountOpen])

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchConversations())
    }
  }, [status, dispatch])

  useEffect(() => {
    if (personasStatus === 'idle') {
      dispatch(fetchPersonas())
    }
  }, [personasStatus, dispatch])

  function openConversation(conv: Conversation) {
    dispatch(selectConversation(conv.id))
    localStorage.setItem('activeConversationId', conv.id)
    onNavigate?.()
    navigate(`/chat/${conv.id}`)
  }

  function handleNewChat() {
    dispatch(selectConversation(null))
    setPickerOpen(true)
  }

  async function handlePick(persona: Persona) {
    setPickerOpen(false)
    const res = await dispatch(createConversation({ persona: persona.id }))
    if (res.meta.requestStatus === 'fulfilled') {
      localStorage.setItem('activeConversationId', (res.payload as Conversation).id)
      onNavigate?.()
      navigate(`/chat/${(res.payload as Conversation).id}`)
    }
  }

  async function handleSkip() {
    const mentor = personas.find((p) => p.id === 'mentor')
    setPickerOpen(false)
    const res = await dispatch(createConversation({ persona: mentor?.id }))
    if (res.meta.requestStatus === 'fulfilled') {
      localStorage.setItem('activeConversationId', (res.payload as Conversation).id)
      onNavigate?.()
      navigate(`/chat/${(res.payload as Conversation).id}`)
    }
  }

  function handleDelete(id: string) {
    dispatch(deleteConversation(id))
  }

  const userInitials = initials(user?.name ?? '?')

  return (
    <div className="flex h-full flex-col bg-ink-900">
      {/* header / brand */}
      <div className="flex items-center gap-3 px-4 pb-3 pt-4">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-index text-ink-950">
          <Archive className="h-4 w-4" strokeWidth={1.9} />
        </span>
        <span className="leading-none">
          <span className="block font-display text-lg font-medium tracking-tight text-paper-100">
            Mnemo
          </span>
          <span className="mt-1 block font-mono text-[0.6rem] uppercase tracking-[0.18em] text-paper-500">
            every answer, traceable
          </span>
        </span>
      </div>

      <div className="space-y-2 px-3 pb-2">
        <NewChatButton onNewChat={handleNewChat} disabled={creating} />
      </div>

      <ChatList
        chats={conversations}
        personas={personas}
        activeId={selectedId}
        status={status}
        onOpen={openConversation}
        onRename={(id, title) => dispatch(renameConversation({ id, title }))}
        onDelete={handleDelete}
        onRetry={() => dispatch(fetchConversations())}
      />

      {/* account footer */}
      <div className="relative border-t border-ink-700 p-3">
        <div ref={accountRef}>
          <button
            type="button"
            onClick={() => setAccountOpen((v) => !v)}
            aria-expanded={accountOpen}
            aria-haspopup="menu"
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors duration-[120ms] hover:bg-ink-800"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-index text-[13px] font-semibold text-ink-950">
              {userInitials}
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-[13px] text-paper-100">
                {user?.name ?? 'Account'}
              </span>
            </span>
            <ChevronDown
              size={14}
              className={`text-paper-500 transition-transform duration-200 ${
                accountOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {accountOpen && (
            <div
              role="menu"
              className="absolute bottom-full left-3 right-3 z-40 mb-1 animate-tag rounded-lg border border-ink-700 bg-ink-800 py-1 shadow-xl"
            >
              {user?.email && (
                <p className="truncate px-3 py-2 font-mono text-[10px] text-paper-500">
                  {user.email}
                </p>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setAccountOpen(false)
                  onNavigate?.()
                  navigate('/dashboard')
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-paper-100 transition-colors duration-[120ms] hover:bg-ink-700"
              >
                Settings
              </button>
              <div className="my-1 h-px bg-ink-700" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setAccountOpen(false)
                  dispatch(logout())
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-red-danger transition-colors duration-[120ms] hover:bg-ink-700"
              >
                <LogOut size={13} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>

      <PersonaPickerModal
        open={pickerOpen}
        personas={personas}
        loading={personasStatus === 'loading'}
        error={personasStatus === 'failed'}
        onPick={handlePick}
        onSkip={handleSkip}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  )
}
