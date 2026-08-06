import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import axiosClient from '@/lib/axios'
import type { Conversation, Message } from '@/types/conversation'
import { logout } from '@/store/authSlice'

interface MessagesState {
  byId: Record<string, Message[]>
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
  sending: boolean
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
}

export const sendMessage = createAsyncThunk(
  'messages/send',
  async ({ conversationId, text }: SendOptions) => {
    const { data } = await axiosClient.post<{
      user_message: Message
      ai_message: Message
    }>(`/conversations/${conversationId}/message`, { message: text })
    return { conversationId, userMessage: data.user_message, aiMessage: data.ai_message }
  },
)

const initialState: MessagesState = {
  byId: {},
  status: 'idle',
  error: null,
  sending: false,
}

function resetMessagesState(state: MessagesState) {
  state.byId = {}
  state.status = 'idle'
  state.error = null
  state.sending = false
}

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMessages.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.byId[action.payload.conversation.id] = action.payload.messages
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.status = 'failed'
        state.error =
          (action.error.message as string) || 'Failed to load this conversation'
      })
      .addCase(sendMessage.pending, (state) => {
        state.sending = true
        state.error = null
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.sending = false
        const thread = state.byId[action.payload.conversationId] ?? []
        state.byId[action.payload.conversationId] = [
          ...thread,
          action.payload.userMessage,
          action.payload.aiMessage,
        ]
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.sending = false
        state.error = (action.error.message as string) || 'Message failed to send'
      })
      .addCase(logout.fulfilled, resetMessagesState)
      .addCase(logout.rejected, resetMessagesState)
  },
})

export default messagesSlice.reducer