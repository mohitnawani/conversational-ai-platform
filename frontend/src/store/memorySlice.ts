import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import axiosClient from '@/lib/axios'
import type { MemoryInsights } from '@/types/conversation'
import { logout } from '@/store/authSlice'

interface MemoryState {
  byId: Record<string, MemoryInsights>
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

export const fetchMemory = createAsyncThunk(
  'memory/fetch',
  async (conversationId: string) => {
    const { data } = await axiosClient.get<MemoryInsights>(
      `/conversations/${conversationId}/memory`,
    )
    return { conversationId, data }
  },
)

const initialState: MemoryState = {
  byId: {},
  status: 'idle',
  error: null,
}

function resetMemoryState(state: MemoryState) {
  state.byId = {}
  state.status = 'idle'
  state.error = null
}

const memorySlice = createSlice({
  name: 'memory',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMemory.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchMemory.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.byId[action.payload.conversationId] = action.payload.data
      })
      .addCase(fetchMemory.rejected, (state, action) => {
        state.status = 'failed'
        state.error =
          (action.error.message as string) || 'Failed to load conversation memory'
      })
      .addCase(logout.fulfilled, resetMemoryState)
      .addCase(logout.rejected, resetMemoryState)
  },
})

export default memorySlice.reducer