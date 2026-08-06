import { useEffect, useState } from 'react'
import { BrainCircuit, PanelLeftClose, PanelLeftOpen, Plus, Sparkles } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store'
import { logout } from '@/store/authSlice'
import { ConversationSidebar } from '@/components/dashboard/ConversationSidebar'
import { useNavigate } from 'react-router'
import { selectConversation } from '@/store/conversationsSlice'

const COLLAPSE_KEY = 'mnemo:sidebar-collapsed'

export function DashboardPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const user = useAppSelector((s) => s.auth.user)
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSE_KEY) === '1',
  )

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
  }, [collapsed])

  function toggleCollapse() {
    setCollapsed((v) => !v)
  }

  function handleNewChat() {
    dispatch(selectConversation(null))
    navigate('/dashboard')
  }

  return (
    <div className="flex min-h-svh flex-col bg-base-200">
      <header className="navbar sticky top-0 z-20 border-b border-base-300 bg-base-100/90 backdrop-blur">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="flex w-full items-center gap-3">
            <button
              className="btn btn-ghost btn-sm btn-square hidden text-base-content/60 hover:text-base-content lg:inline-flex"
              onClick={toggleCollapse}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-pressed={collapsed}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-content shadow-sm shadow-primary/30">
              <BrainCircuit className="h-4 w-4" />
            </span>
            <h1 className="font-display text-lg font-semibold tracking-tight text-base-content">
              Mnemo
            </h1>
            <div className="ml-auto flex items-center gap-4">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium leading-tight text-base-content">
                  {user?.name}
                </p>
                <p className="font-mono text-xs leading-tight text-base-content/50">
                  {user?.email}
                </p>
              </div>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => dispatch(logout())}
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div
        className={`mx-auto grid w-full max-w-6xl flex-1 gap-5 px-4 py-6 transition-[grid-template-columns] duration-300 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] ${
          collapsed
            ? 'lg:!grid-cols-[4.75rem_minmax(0,1fr)]'
            : 'lg:!grid-cols-[18rem_minmax(0,1fr)]'
        }`}
      >
        <aside className="card h-fit bg-base-100 ring-1 ring-base-300 lg:sticky lg:top-20 lg:h-[calc(100svh-6.5rem)]">
          <div
            className={`card-body h-full gap-3 ${
              collapsed ? 'items-center p-3' : 'p-4'
            }`}
          >
            {collapsed ? (
              <button
                className="btn btn-ghost btn-sm btn-square text-base-content/70 hover:text-primary"
                onClick={handleNewChat}
                aria-label="New chat"
              >
                <Plus className="h-4 w-4" />
              </button>
            ) : (
              <ConversationSidebar />
            )}
          </div>
        </aside>

        <main className="card bg-base-100 ring-1 ring-base-300">
          <div className="card-body p-6 sm:p-8">
            <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-6 w-6" />
              </span>
              <h2 className="font-display text-heading font-semibold text-base-content">
                Welcome, {user?.name?.split(' ')[0]}
              </h2>
              <p className="max-w-sm text-body text-base-content/60">
                Open a conversation to keep going, or start a new one — Mnemo
                remembers every thread.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
