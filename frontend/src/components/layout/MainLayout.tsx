import { useState, type ReactNode } from 'react'
import { Menu } from 'lucide-react'
import { AppSidebar } from '@/components/layout/AppSidebar'

interface MainLayoutProps {
  /** mono title shown in the mobile top bar */
  title?: ReactNode
  children: ReactNode
}

/**
 * Main app shell: constant sidebar on desktop, slide-over overlay on mobile,
 * full-width content column beside it.
 */
export function MainLayout({ title, children }: MainLayoutProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex h-dvh overflow-hidden bg-ink-950 text-paper-100">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 shrink-0 border-r border-ink-700 bg-ink-900 transition-transform duration-200 ease-out lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <AppSidebar onNavigate={() => setOpen(false)} />
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 px-3 pb-1 pt-2 sm:px-5 lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open chat list"
            className="-ml-1 rounded-lg p-2 text-paper-500 transition-colors duration-[120ms] hover:bg-ink-800 hover:text-paper-100"
          >
            <Menu size={17} />
          </button>
          {title && (
            <p className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-paper-500">
              {title}
            </p>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}
