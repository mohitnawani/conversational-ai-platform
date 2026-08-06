import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, MessageSquarePlus, RefreshCw, Send } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store'
import { logout } from '@/store/authSlice'
import { fetchMessages, sendMessage } from '@/store/messagesSlice'

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const dispatch = useAppDispatch()
  const { byId, status, sending, error } = useAppSelector((s) => s.messages)
  const conversations = useAppSelector((s) => s.conversations.conversations)
  const conversation = conversations.find((c) => c.id === conversationId)
  const messages = conversationId ? (byId[conversationId] ?? []) : []

  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (conversationId) {
      dispatch(fetchMessages(conversationId))
    }
  }, [conversationId, dispatch])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, sending])

  async function handleSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!conversationId) return
    const trimmed = text.trim()
    if (!trimmed || sending) return

    const res = await dispatch(sendMessage({ conversationId, text: trimmed }))
    if (res.meta.requestStatus === 'fulfilled') {
      setText('')
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-base-200">
      <header className="navbar sticky top-0 z-20 border-b border-base-300 bg-base-100/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-2 px-4">
          <Link
            to="/dashboard"
            className="btn btn-ghost btn-sm btn-circle mr-1"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-lg font-semibold tracking-tight text-base-content">
              {conversation?.title ?? 'Conversation'}
            </h1>
            <p className="font-mono text-[0.7rem] tracking-wide text-base-content/50">
              {conversation
                ? `${conversation.persona.toUpperCase()} · ${conversation.memory_type.toUpperCase()} MEMORY · EVERY WORD REMEMBERED`
                : 'EVERY WORD REMEMBERED'}
            </p>
          </div>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => dispatch(logout())}
          >
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6">
        <div className="flex-1 space-y-4 overflow-y-auto">
          {status === 'loading' && messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <span className="loading loading-spinner loading-lg text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 pb-10 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                <MessageSquarePlus className="h-6 w-6" />
              </span>
              <p className="font-mono text-eyebrow uppercase text-primary">
                <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle" />
                New thread
              </p>
              <p className="font-display text-heading font-semibold text-base-content">
                Start the thread
              </p>
              <p className="max-w-sm text-body text-base-content/60">
                Say hello — Mnemo holds on to names, facts, and every thread you
                give it.
              </p>
            </div>
          ) : (
            <>
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm sm:max-w-[70%] ${
                      m.role === 'user'
                        ? 'rounded-br-md bg-primary text-primary-content'
                        : 'rounded-bl-md bg-base-100 text-base-content ring-1 ring-base-300'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-body leading-relaxed">
                      {m.content}
                    </p>
                    <p
                      className={`mt-1 font-mono text-[0.65rem] tracking-wide ${
                        m.role === 'user'
                          ? 'text-primary-content/60'
                          : 'text-base-content/40'
                      }`}
                    >
                      {formatTime(m.created_at)}
                    </p>
                  </div>
                </div>
              ))}

              {sending && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md bg-base-100 px-4 py-3 ring-1 ring-base-300">
                    <span className="loading loading-dots loading-sm text-primary" />
                  </div>
                </div>
              )}
            </>
          )}

          {status === 'failed' && (
            <button
              className="btn btn-ghost btn-sm mx-auto flex gap-2 text-base-content/70"
              onClick={() => conversationId && dispatch(fetchMessages(conversationId))}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Couldn't load this thread — retry
            </button>
          )}

          <div ref={bottomRef} />
        </div>

        {error && status !== 'failed' && (
          <p role="alert" className="mb-3 text-helper text-error">
            {error}
          </p>
        )}

        <form onSubmit={handleSend} className="mt-4 flex items-center gap-2 sticky bottom-0 bg-base-200 py-4">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a message… Mnemo will remember it"
            aria-label="Message"
            disabled={sending}
            className="input input-bordered w-full bg-base-100 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 disabled:opacity-60"
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={sending || !text.trim()}
            aria-label="Send message"
          >
            {sending ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      </main>
    </div>
  )
}