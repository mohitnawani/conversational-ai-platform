import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit'
import axiosClient from '@/lib/axios'
import { friendlyError } from '@/lib/errors'
import type { Conversation, Message } from '@/types/conversation'
import { logout } from '@/store/authSlice'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

interface MessagesState {
  byId: Record<string, Message[]>
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
  sending: boolean
  /** conversationId currently streaming tokens, or null */
  streaming: string | null
  /** text revealed in the UI so far (paced by the interval in ChatPage) */
  streamingContent: string
  /** raw chunks received from the backend, not yet revealed */
  streamBuffer: string
}

export const fetchMessages = createAsyncThunk(
  'messages/fetch',
  async (conversationId: string) => {
    const { data } = await axiosClient.get<Conversation & { messages: Message[] }>(
      `/conversations/${conversationId}`,
    )
    const { messages, ...conversation } = data
    return { conversation, messages }
  },
)

interface SendOptions {
  conversationId: string
  text: string
  /** Browser-saved custom persona instructions, if one is active. */
  systemPrompt?: string
}

/** Non-streaming JSON fallback (still used if the stream can't start). */
export const sendMessage = createAsyncThunk(
  'messages/send',
  async ({ conversationId, text, systemPrompt }: SendOptions) => {
    const { data } = await axiosClient.post<{
      user_message: Message
      ai_message: Message
      conversation: Conversation
    }>(`/conversations/${conversationId}/message`, {
      message: text,
      system_prompt: systemPrompt,
    })
    return {
      conversationId,
      userMessage: data.user_message,
      aiMessage: data.ai_message,
      conversation: data.conversation,
    }
  },
)

function csrfToken(): string {
  const match = document.cookie.split('; ').find((c) => c.startsWith('csrf_access_token='))
  return match ? match.slice('csrf_access_token='.length) : ''
}

interface StreamResult {
  conversationId: string
  fallback: boolean
}

/**
 * Send via the SSE endpoint (fetch + ReadableStream — EventSource only does
 * GET). Events: `user_message`, `token`, `done`, `error`. If the stream cannot
 * start at all, falls back to the JSON `sendMessage` route.
 */
export const streamMessage = createAsyncThunk<StreamResult, SendOptions>(
  'messages/stream',
  async ({ conversationId, text, systemPrompt }, { dispatch, rejectWithValue }) => {
    let res: Response
    try {
      res = await fetch(
        `${BASE_URL}/conversations/${conversationId}/message/stream`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': csrfToken(),
          },
          body: JSON.stringify({ message: text, system_prompt: systemPrompt }),
        },
      )
      if (!res.ok) throw new Error(`Request failed with status ${res.status}`)
    } catch {
      const res2 = await dispatch(sendMessage({ conversationId, text, systemPrompt }))
      if (sendMessage.fulfilled.match(res2) && res2.payload.conversation) {
        // keep sidebar title in sync when the backend auto-names the chat
        dispatch({
          type: 'conversations/upsertConversation',
          payload: res2.payload.conversation,
        })
      }
      return { conversationId, fallback: true }
    }

    dispatch(streamStart(conversationId))

    let resolved = false
    const handleBlock = (block: string) => {
      let event = ''
      const dataLines: string[] = []
      for (const line of block.split('\n')) {
        if (line.startsWith('event: ')) event = line.slice(7)
        else if (line.startsWith('data: ')) dataLines.push(line.slice(6))
      }
      if (dataLines.length === 0) return
      const payload = JSON.parse(dataLines.join('\n'))
      if (event === 'user_message') {
        dispatch(pushUserMessage({ conversationId, message: payload as Message }))
      } else if (event === 'conversation') {
        dispatch({
          type: 'conversations/upsertConversation',
          payload: payload as Conversation,
        })
      } else if (event === 'token') {
        dispatch(streamAppend({ delta: (payload as { delta?: string }).delta ?? '' }))
      } else if (event === 'done') {
        // A reply with no actual text (whitespace-only) is a failure, not a
        // successful turn — an empty saved bubble must never render.
        if (!(payload as Message).content?.trim()) {
          throw new Error('The AI did not return a reply. Please try again.')
        }
        resolved = true
        dispatch(pushAssistantMessage({ conversationId, message: payload as Message }))
      } else if (event === 'error') {
        throw new Error((payload as { error?: string }).error ?? 'Stream failed')
      }
    }

    try {
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let sep = buffer.indexOf('\n\n')
        while (sep !== -1) {
          handleBlock(buffer.slice(0, sep))
          buffer = buffer.slice(sep + 2)
          sep = buffer.indexOf('\n\n')
        }
      }
      if (!resolved) throw new Error('Stream ended before a reply arrived')
    } catch (error) {
      const message = friendlyError((error as Error).message || 'Stream failed')
      dispatch(streamFail(message))
      return rejectWithValue(message)
    }

    return { conversationId, fallback: false }
  },
)

const initialState: MessagesState = {
  byId: {},
  status: 'idle',
  error: null,
  sending: false,
  streaming: null,
  streamingContent: '',
  streamBuffer: '',
}

function resetMessagesState(state: MessagesState) {
  state.byId = {}
  state.status = 'idle'
  state.error = null
  state.sending = false
  state.streaming = null
  state.streamingContent = ''
  state.streamBuffer = ''
}

/** Keep every thread strictly ascending by created_at, tie-broken by id. */
function sortThread(messages: Message[]): Message[] {
  return [...messages].sort((a, b) =>
    a.created_at === b.created_at
      ? (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
      : (a.created_at < b.created_at ? -1 : 1),
  )
}

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    streamStart(state, action: PayloadAction<string>) {
      state.sending = true
      state.streaming = action.payload
      state.streamingContent = ''
      state.streamBuffer = ''
      state.error = null
    },
    streamAppend(state, action: PayloadAction<{ delta: string }>) {
      // Live: every SSE `token` event renders immediately — the server's
      // chunk cadence IS the pacing (no artificial typing throttle).
      state.streamingContent += action.payload.delta
      state.streamBuffer = ''
    },
    streamTick(state) {
      // Safety flush only: the buffer is normally empty because streamAppend
      // renders inline. Kept as a catch-up for dispatch ordering edge cases.
      if (state.streaming === null) return
      if (state.streamBuffer) {
        state.streamingContent += state.streamBuffer
        state.streamBuffer = ''
      }
    },
    streamFlush(state) {
      state.streamingContent += state.streamBuffer
      state.streamBuffer = ''
    },
    pushUserMessage(
      state,
      action: PayloadAction<{ conversationId: string; message: Message }>,
    ) {
      const { conversationId, message } = action.payload
      const thread = state.byId[conversationId] ?? []
      if (!thread.some((m) => m.id === message.id)) {
        state.byId[conversationId] = sortThread([...thread, message])
      }
    },
    pushAssistantMessage(
      state,
      action: PayloadAction<{ conversationId: string; message: Message }>,
    ) {
      const { conversationId, message } = action.payload
      const thread = state.byId[conversationId] ?? []
      state.byId[conversationId] = sortThread([
        ...thread.filter((m) => m.id !== message.id),
        message,
      ])
      state.sending = false
      state.streaming = null
      state.streamingContent = ''
      state.streamBuffer = ''
    },
    streamFail(state, action: PayloadAction<string>) {
      state.streamingContent += state.streamBuffer
      state.streamBuffer = ''
      state.sending = false
      state.streaming = null
      state.error = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMessages.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.byId[action.payload.conversation.id] = sortThread(action.payload.messages)
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.status = 'failed'
        state.error = friendlyError(action.error.message, 'Failed to load this conversation')
      })
      .addCase(sendMessage.pending, (state) => {
        state.sending = true
        state.error = null
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.sending = false
        const thread = state.byId[action.payload.conversationId] ?? []
        state.byId[action.payload.conversationId] = sortThread([
          ...thread,
          action.payload.userMessage,
          action.payload.aiMessage,
        ])
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.sending = false
        state.streaming = null
        state.error = friendlyError(action.error.message, 'Message failed to send')
      })
      .addCase(streamMessage.rejected, (state) => {
        state.streamingContent += state.streamBuffer
        state.streamBuffer = ''
        state.sending = false
        state.streaming = null
      })
      .addCase(logout.fulfilled, resetMessagesState)
      .addCase(logout.rejected, resetMessagesState)
  },
})

export const {
  streamStart,
  streamAppend,
  streamTick,
  streamFlush,
  pushUserMessage,
  pushAssistantMessage,
  streamFail,
} = messagesSlice.actions

export default messagesSlice.reducer
