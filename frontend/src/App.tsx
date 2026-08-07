import { useEffect, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
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

// The auth cookie hasn't been checked yet while status is 'idle' (fetchMe is
// dispatched on mount). All guards must wait for it, otherwise a hard refresh
// on a deep link bounces /chat/:id -> /login -> /dashboard.
function isAuthPending(status: string) {
  return status === 'idle' || status === 'loading'
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, status } = useAppSelector((s) => s.auth)
  if (isAuthPending(status)) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function GuestRoute({ children }: { children: ReactNode }) {
  const { user, status } = useAppSelector((s) => s.auth)
  if (isAuthPending(status)) return <LoadingScreen />
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

function RootRedirect() {
  const { user, status } = useAppSelector((s) => s.auth)
  if (isAuthPending(status)) return <LoadingScreen />
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
