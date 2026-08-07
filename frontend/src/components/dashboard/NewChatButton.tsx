import { Plus } from 'lucide-react'

interface NewChatButtonProps {
  onNewChat: () => void
  disabled?: boolean
}

export function NewChatButton({ onNewChat, disabled }: NewChatButtonProps) {
  return (
    <button
      type="button"
      onClick={onNewChat}
      disabled={disabled}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-ink-700 bg-ink-800 py-2.5 text-sm font-medium text-paper-100 transition-colors duration-[120ms] hover:border-amber-index/50 hover:text-amber-index disabled:cursor-not-allowed disabled:opacity-50"
    >
      {disabled ? (
        <span
          aria-hidden
          className="h-4 w-4 animate-spin rounded-full border-2 border-ink-700 border-t-amber-index"
        />
      ) : (
        <Plus size={15} className="text-amber-index" />
      )}
      New chat
    </button>
  )
}