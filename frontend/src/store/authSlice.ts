import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import axiosClient from '@/lib/axios'

export interface User {
  id: string
  name: string
  email: string
  created_at: string
}

interface AuthState {
  user: User | null
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

interface AuthResponse {
  user: User
}

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }) => {
    const { data } = await axiosClient.post<AuthResponse>(
      '/auth/login',
      credentials,
    )
    return data
  },
)

export const register = createAsyncThunk(
  'auth/register',
  async (credentials: { name: string; email: string; password: string }) => {
    const { data } = await axiosClient.post<AuthResponse>(
      '/auth/register',
      credentials,
    )
    return data
  },
)

export const fetchMe = createAsyncThunk('auth/fetchMe', async () => {
  const { data } = await axiosClient.get<User>('/auth/me')
  return data
})

export const logout = createAsyncThunk('auth/logout', async () => {
  await axiosClient.post('/auth/logout')
})

const initialState: AuthState = {
  user: null,
  status: 'idle',
  error: null,
}

function resetAuthState(state: AuthState) {
  state.user = null
  state.status = 'idle'
  state.error = null
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    resetAuth: resetAuthState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.user = action.payload.user
        state.error = null
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'failed'
        state.error = (action.error.message as string) || 'Login failed'
      })
      .addCase(register.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(register.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.user = action.payload.user
        state.error = null
      })
      .addCase(register.rejected, (state, action) => {
        state.status = 'failed'
        state.error = (action.error.message as string) || 'Registration failed'
      })
      .addCase(fetchMe.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.user = action.payload
      })
      .addCase(fetchMe.rejected, (state) => {
        state.status = 'failed'
        state.user = null
      })
      .addCase(logout.fulfilled, resetAuthState)
      .addCase(logout.rejected, resetAuthState)
  },
})

export const { resetAuth } = authSlice.actions

export default authSlice.reducer
