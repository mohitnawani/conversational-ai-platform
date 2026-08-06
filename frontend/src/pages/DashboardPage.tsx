import { useAppDispatch, useAppSelector } from '@/store'
import { logout } from '@/store/authSlice'

export function DashboardPage() {
  const dispatch = useAppDispatch()
  const user = useAppSelector((s) => s.auth.user)

  return (
    <div className="min-h-svh bg-base-200 p-6">
      <header className="navbar mx-auto max-w-5xl rounded-box bg-base-100 px-4 shadow-sm">
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Conversational AI Platform</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right text-sm">
            <p className="font-medium">{user?.name}</p>
            <p className="text-base-content/60">{user?.email}</p>
          </div>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => dispatch(logout())}
          >
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto mt-8 max-w-5xl">
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title">Welcome, {user?.name}</h2>
            <p className="text-base-content/60">
              Your workspace is ready. Conversations, personas, and memory features
              will be built out here next.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
