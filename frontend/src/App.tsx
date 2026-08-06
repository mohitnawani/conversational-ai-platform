import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/store'
import { fetchMe } from '@/store/authSlice'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { DashboardPage } from '@/pages/DashboardPage'

type AuthScreen = 'login' | 'register'

const App = () => {
  const dispatch = useAppDispatch()
  const { user, status } = useAppSelector((s) => s.auth)
  const [screen, setScreen] = useState<AuthScreen>('login')

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchMe())
    }
  }, [status, dispatch])

  if (status === 'loading') {
    return (
      <div className="flex min-h-svh items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    )
  }

  if (user) {
    return <DashboardPage />
  }

  if (screen === 'register') {
    return <RegisterPage onShowLogin={() => setScreen('login')} />
  }

  return <LoginPage onShowRegister={() => setScreen('register')} />
}

export default App
