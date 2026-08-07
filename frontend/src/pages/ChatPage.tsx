import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useParams } from 'react-router'
import { Network } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store'
import { fetchMessages, streamMessage, streamTick } from '@/store/messagesSlice'
import { fetchMemory } from '@/store/memorySlice'
import {
  fetchPersonas,
  fetchConversations,
  selectConversation,
  updatePersona,
  updateMemoryType,
  fetchMemoryOverrides,
  setPersonaMemory,
  resetPersonaMemory,
} from '@/store/conversationsSlice'
import { MainLayout } from '@/components/layout/MainLayout'
import { PersonaBar } from '@/components/chat/PersonaBar'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { SourceDrawer } from '@/components/chat/SourceDrawer'
import { MemoryPanel } from '@/components/chat/MemoryPanel'
import { Composer } from '@/components/chat/Composer'
import { getCustomPersonas } from '@/components/chat/personas'
import type { Message, Source } from '@/types/conversation'

/*
 * Demo citations — dev builds only. The backend replies are plain text, so
 * this makes the citation rail / source drawer verifiable during design.
 * Production builds render citations only when the API returns `sources`.
 */
const DEMO_SOURCES: Source[] = [
  {
    fileName: 'research_paper.pdf',
    chunk: 'p.12',
    excerpt:
      'The retrieval-augmented pipeline grounds every generation in the ranked passages retrieved from the user corpus at query time.',
  },
  {
    fileName: 'quarterly_report.pdf',
    chunk: 'p.4',
    excerpt:
      'Retention across conversations improved when answers carried explicit citation markers back to their source chunks.',
  },
  {
    fileName: 'transcript.mp4',
    chunk: '00:14:32',
    excerpt: '— so the assistant has to show the user where each claim came from, otherwise trust erodes.',
  },
]

function sourcesFor(m: Message): Source[] | null {
  if (m.sources && m.sources.length > 0) return m.sources
  if (import.meta.env.DEV && m.role === 'assistant') return DEMO_SOURCES
  return null
}

const EXAMPLE_QUESTIONS = [
  'What does this document cover?',
  'Summarize the key points',
  'What are the main conclusions?',
]

function ChatEmptyState({
  personaName,
  onPick,
}: {
  personaName: string
  onPick: (q: string) => void
}) {
  return (
    <div className="relative flex h-full animate-rise flex-col items-center justify-center px-4 text-center">
      <div
        aria-hidden
        className="amber-wash pointer-events-none absolute inset-0"
      />
      <div className="relative flex flex-col items-center">
        <h2 className="font-display text-[32px] font-medium leading-[1.15] text-paper-100">
          Ask anything.
        </h2>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.22em] text-amber-index">
          mode: {personaName}
        </p>
        <p className="mt-4 max-w-sm text-sm text-paper-500">
          Answers come from your sources only — every reply is bound to the passage it came from.
        </p>
        <div className="mt-7 flex max-w-md flex-wrap justify-center gap-2">
          {EXAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onPick(q)}
              className="inline-flex items-center gap-2 rounded-md border border-ink-700 bg-ink-800 py-1.5 pl-1.5 pr-3 text-xs text-paper-500 transition-colors duration-[120ms] hover:border-amber-index hover:text-amber-index"
            >
              <span className="h-3.5 w-[2px] rounded-full bg-amber-index" aria-hidden />
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const dispatch = useAppDispatch()
  const { byId, status, sending, error, streaming, streamingContent } = useAppSelector(
    (s) => s.messages,
  )
  const { conversations, personas, personasStatus, personaMemory } = useAppSelector(
    (s) => s.conversations,
  )
  const memoryState = useAppSelector((s) => s.memory)
  const conversation = conversations.find((c) => c.id === conversationId)
  const messages = conversationId ? (byId[conversationId] ?? []) : []
  const memory = conversationId ? (memoryState.byId[conversationId] ?? null) : null

  const [text, setText] = useState('')
  const [customOverride, setCustomOverride] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerSources, setDrawerSources] = useState<Source[]>([])
  const [drawerActive, setDrawerActive] = useState<number | null>(null)

  const [memoryOpen, setMemoryOpen] = useState(false)

  const activePersona = customOverride ?? conversation?.persona ?? personas[0]?.id ?? 'mentor'
  const customPersona = customOverride
    ? getCustomPersonas().find((persona) => persona.id === customOverride)
    : undefined
  const personaName = customPersona?.name
    ?? personas.find((p) => p.id === activePersona)?.name
    ?? activePersona.toUpperCase()

  useEffect(() => {
    if (conversationId) {
      // Redux is rebuilt on every browser refresh. Reload both the sidebar
      // metadata and the complete thread from the backend rather than relying
      // on transient in-memory message state.
      dispatch(selectConversation(conversationId))
      localStorage.setItem('activeConversationId', conversationId)
      dispatch(fetchConversations())
      dispatch(fetchMessages(conversationId))
    }
  }, [conversationId, dispatch])

  useEffect(() => {
    if (personasStatus === 'idle') {
      dispatch(fetchPersonas())
    }
  }, [personasStatus, dispatch])

  useEffect(() => {
    dispatch(fetchMemoryOverrides())
  }, [dispatch])

  useEffect(() => {
    const savedId = conversationId
      ? localStorage.getItem(`mnemo:conversation-persona:${conversationId}`)
      : null
    const savedPersona = savedId
      ? getCustomPersonas().find((persona) => persona.id === savedId)
      : undefined
    setCustomOverride(savedPersona ? savedPersona.id : null)
    setDrawerOpen(false)
  }, [conversationId])

  useEffect(() => {
    if (memoryOpen && conversationId) {
      dispatch(fetchMemory(conversationId))
    }
  }, [memoryOpen, conversationId, dispatch])

  // Keep the inspector live while a message streams (token counts change).
  useEffect(() => {
    if (memoryOpen && conversationId && !sending) {
      dispatch(fetchMemory(conversationId))
    }
  }, [messages.length, sending, memoryOpen, conversationId, conversation?.memory_type, dispatch])

  // Pace the reveal: backend chunks land in the store buffer instantly, but
  // the UI only shows a few words per tick so the reply types itself out.
  useEffect(() => {
    if (!sending) return
    const timer = setInterval(() => {
      dispatch(streamTick())
    }, 30)
    return () => clearInterval(timer)
  }, [sending, dispatch])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages.length, sending, streamingContent])

  function handlePersonaSelect(id: string) {
    if (id.startsWith('custom-')) {
      setCustomOverride(id)
      if (conversationId) {
        localStorage.setItem(`mnemo:conversation-persona:${conversationId}`, id)
      }
      return
    }
    setCustomOverride(null)
    if (conversationId) {
      localStorage.removeItem(`mnemo:conversation-persona:${conversationId}`)
    }
    if (conversationId && id !== conversation?.persona) {
      dispatch(updatePersona({ id: conversationId, persona: id }))
    }
  }

  function openSources(sources: Source[], index: number) {
    setDrawerSources(sources)
    setDrawerActive(index)
    setDrawerOpen(true)
  }

  async function handleSend(value: string) {
    if (!conversationId || sending) return
    const trimmed = value.trim()
    if (!trimmed) return
    setText('')
    await dispatch(streamMessage({
      conversationId,
      text: trimmed,
      systemPrompt: customPersona?.system || undefined,
    }))
  }

  function handleComposerSubmit(e: FormEvent) {
    e.preventDefault()
    if (text.trim()) {
      void handleSend(text)
    }
  }

  function handleMemoryTypeChange(memoryType: string | null) {
    if (!conversationId) return
    if (memoryType === null) {
      void dispatch(resetPersonaMemory(activePersona))
      const personaDefault = personas.find(
        (p) => p.id === activePersona,
      )?.default_memory_type
      if (conversation && personaDefault && conversation.memory_type !== personaDefault) {
        void dispatch(updateMemoryType({ id: conversationId, memory_type: personaDefault }))
      }
      return
    }
    if (personaMemory[activePersona] !== memoryType) {
      void dispatch(setPersonaMemory({ persona: activePersona, memory_type: memoryType }))
    }
    if (conversation && conversation.memory_type !== memoryType) {
      void dispatch(updateMemoryType({ id: conversationId, memory_type: memoryType }))
    }
  }

  return (
    <MainLayout title={conversation?.title}>
      <PersonaBar personas={personas} activeId={activePersona} onSelect={handlePersonaSelect} />

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <button
          type="button"
          onClick={() => setMemoryOpen((prev) => !prev)}
          aria-pressed={memoryOpen}
          className={`absolute right-4 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] backdrop-blur-sm transition-colors duration-[120ms] ${
            memoryOpen
              ? 'border-amber-index bg-amber-tint text-amber-index'
              : 'border-ink-700 bg-ink-900/80 text-paper-500 hover:border-amber-index hover:text-amber-index'
          }`}
        >
          <Network size={13} />
          Memory
        </button>

        <div
          ref={scrollRef}
          className="h-full space-y-6 overflow-y-auto px-4 py-6 sm:px-8"
        >
          {status === 'idle' || (status === 'loading' && messages.length === 0) ? (
            <div className="flex h-full items-center justify-center">
              <span
                aria-hidden
                className="h-5 w-5 animate-spin rounded-full border-2 border-ink-700 border-t-amber-index"
              />
            </div>
          ) : messages.length === 0 ? (
            <ChatEmptyState
              personaName={personaName}
              onPick={(q) => {
                setText(q)
                void handleSend(q)
              }}
            />
          ) : (
            <>
              {messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  role={m.role === 'user' ? 'user' : 'assistant'}
                  content={m.content}
                  citations={sourcesFor(m)}
                  timestamp={m.created_at}
                  onOpenSource={(idx) => {
                    const srcs = sourcesFor(m)
                    if (srcs) openSources(srcs, idx)
                  }}
                />
              ))}
              {sending && (
                <MessageBubble
                  role="assistant"
                  content={streaming === conversationId ? streamingContent : ''}
                  isStreaming
                  citations={null}
                />
              )}
            </>
          )}

          {status === 'failed' && (
            <button
              type="button"
              className="mx-auto flex items-center gap-2 rounded-lg border border-ink-700 px-3 py-2 text-xs text-paper-500 transition-colors duration-[120ms] hover:border-amber-index hover:text-amber-index"
              onClick={() => conversationId && dispatch(fetchMessages(conversationId))}
            >
              Couldn't load this thread — retry
            </button>
          )}
        </div>

        <SourceDrawer
          open={drawerOpen}
          sources={drawerSources}
          activeIndex={drawerActive}
          onClose={() => setDrawerOpen(false)}
          onPick={(i) => setDrawerActive(i)}
        />

        <MemoryPanel
          open={memoryOpen}
          memory={memory}
          loading={memoryState.status === 'loading'}
          error={memoryState.error}
          onClose={() => setMemoryOpen(false)}
          onRetry={() => conversationId && dispatch(fetchMemory(conversationId))}
          memoryType={
            (personas.find((p) => p.id === activePersona)?.default_memory_type ??
              conversation?.memory_type ??
              'buffer') === conversation?.memory_type
              ? 'default'
              : (conversation?.memory_type ?? 'buffer')
          }
          defaultMemoryLabel={
            personas.find((p) => p.id === activePersona)?.name ?? activePersona
          }
          onMemoryTypeChange={handleMemoryTypeChange}
        />
      </div>

      {error && (
        <p role="alert" className="px-5 pb-2 text-xs text-red-danger">
          {error}
        </p>
      )}

      <form onSubmit={handleComposerSubmit}>
        <Composer
          onSend={(value) => void handleSend(value)}
          disabled={sending}
          placeholder={sending ? 'Answering…' : 'Ask anything — grounded in your sources…'}
        />
      </form>
    </MainLayout>
  )
}
