import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import axiosClient from '@/lib/axios'
import type { Conversation, Persona } from '@/types/conversation'
import { logout } from '@/store/authSlice'
import { fetchMessages } from '@/store/messagesSlice'

interface ConversationsState {
  conversations: Conversation[]
  selectedId: string | null
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  creating: boolean
  error: string | null
  personas: Persona[]
  personasStatus: 'idle' | 'loading' | 'succeeded' | 'failed'
}

export const fetchConversations = createAsyncThunk(
  'conversations/fetch',
  async () => {
    const { data } = await axiosClient.get<Conversation[]>('/conversations')
    return data
  },
)

export const fetchPersonas = createAsyncThunk('conversations/personas', async () => {
  const { data } = await axiosClient.get<Persona[]>('/conversations/personas')
  return data
})

interface CreateOptions {
  title?: string
  memory_type?: string
  persona?: string
}

export const createConversation = createAsyncThunk(
  'conversations/create',
  async (opts: CreateOptions = {}) => {
    const { data } = await axiosClient.post<Conversation>('/conversations', opts)
    return data
  },
)

export const renameConversation = createAsyncThunk(
  'conversations/rename',
  async ({ id, title }: { id: string; title: string }) => {
    const { data } = await axiosClient.put<Conversation>(`/conversations/${id}`, {
      title,
    })
    return data
  },
)

export const deleteConversation = createAsyncThunk(
  'conversations/delete',
  async (id: string) => {
    await axiosClient.delete(`/conversations/${id}`)
    return id
  },
)

const initialState: ConversationsState = {
  conversations: [],
  selectedId: null,
  status: 'idle',
  creating: false,
  error: null,
  personas: [],
  personasStatus: 'idle',
}

function resetConversationsState(state: ConversationsState) {
  state.conversations = []
  state.selectedId = null
  state.status = 'idle'
  state.creating = false
  state.error = null
  state.personas = []
  state.personasStatus = 'idle'
}

function upsertConversation(
  state: ConversationsState,
  conv: Conversation,
) {
  const index = state.conversations.findIndex((c) => c.id === conv.id)
  if (index === -1) {
    state.conversations.unshift(conv)
    return
  }
  state.conversations[index] = { ...state.conversations[index], ...conv }
}

const conversationsSlice = createSlice({
  name: 'conversations',
  initialState,
  reducers: {
    selectConversation(state, action: { payload: string | null }) {
      state.selectedId = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.conversations = action.payload
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.status = 'failed'
        state.error = (action.error.message as string) || 'Failed to load conversations'
      })
      .addCase(fetchPersonas.pending, (state) => {
        state.personasStatus = 'loading'
      })
      .addCase(fetchPersonas.fulfilled, (state, action) => {
        state.personasStatus = 'succeeded'
        state.personas = action.payload
      })
      .addCase(fetchPersonas.rejected, (state) => {
        state.personasStatus = 'failed'
      })
      .addCase(createConversation.pending, (state) => {
        state.creating = true
        state.error = null
      })
      .addCase(createConversation.fulfilled, (state, action) => {
        state.creating = false
        state.conversations = [
          action.payload,
          ...state.conversations.filter((c) => c.id !== action.payload.id),
        ]
        state.selectedId = action.payload.id
      })
      .addCase(createConversation.rejected, (state, action) => {
        state.creating = false
        state.error = (action.error.message as string) || 'Failed to create conversation'
      })
      .addCase(renameConversation.fulfilled, (state, action) => {
        upsertConversation(state, action.payload)
      })
      .addCase(renameConversation.rejected, (state, action) => {
        state.error = (action.error.message as string) || 'Failed to rename conversation'
      })
      .addCase(deleteConversation.fulfilled, (state, action) => {
        state.conversations = state.conversations.filter(
          (c) => c.id !== action.payload,
        )
        if (state.selectedId === action.payload) {
          state.selectedId = null
        }
      })
      .addCase(deleteConversation.rejected, (state, action) => {
        state.error = (action.error.message as string) || 'Failed to delete conversation'
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        upsertConversation(state, action.payload.conversation)
      })
      .addCase(logout.fulfilled, resetConversationsState)
      .addCase(logout.rejected, resetConversationsState)
  },
})

export const { selectConversation } = conversationsSlice.actions

export default conversationsSlice.reducer