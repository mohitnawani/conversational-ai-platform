import { useEffect, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router'
import { useAppDispatch, useAppSelector } from '@/store'
import { fetchMe } from '@/store/authSlice'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ChatPage } from '@/pages/ChatPage'

function LoadingScreen() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-ink-950">
      <span
        aria-hidden
        className="h-6 w-6 animate-spin rounded-full border-2 border-ink-700 border-t-amber-index"
      />
    </div>
  )
}

// The auth cookie hasn't been checked yet while `checked` is false (fetchMe
// is dispatched on mount). All guards must wait for it, otherwise a hard
// refresh on a deep link bounces /chat/:id -> /login -> /dashboard. Once
// the session has been checked, a pending login/register must NOT unmount
// the guest form — that would wipe the user's typed credentials on failure.
function isAuthPending(checked: boolean) {
  return !checked
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, checked } = useAppSelector((s) => s.auth)
  const location = useLocation()
  if (isAuthPending(checked)) return <LoadingScreen />
  if (!user) {
    // Remember where the user was headed so the auth pages can send them
    // straight back after a successful login.
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    )
  }
  return children
}

function GuestRoute({ children }: { children: ReactNode }) {
  const { user, checked } = useAppSelector((s) => s.auth)
  const location = useLocation()
  if (isAuthPending(checked)) return <LoadingScreen />
  if (user) {
    // After a successful login/register, send the user back to wherever the
    // ProtectedRoute originally bounced them from.
    const state = location.state as { from?: unknown } | null
    const from = typeof state?.from === 'string' ? state.from : null
    const safe =
      from && from.startsWith('/') && !from.startsWith('/login') && !from.startsWith('/register')
    return <Navigate to={safe ? from : '/dashboard'} replace />
  }
  return children
}

function RootRedirect() {
  const { user, checked } = useAppSelector((s) => s.auth)
  if (isAuthPending(checked)) return <LoadingScreen />
  return <Navigate to={user ? '/dashboard' : '/login'} replace />
}

const App = () => {
  const dispatch = useAppDispatch()
  const { status } = useAppSelector((s) => s.auth)

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchMe())
    }
  }, [status, dispatch])

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          }
        />
        <Route
          path="/register"
          element={
            <GuestRoute>
              <RegisterPage />
            </GuestRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat/:conversationId"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
