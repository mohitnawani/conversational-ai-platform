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
      className="btn btn-ghost w-full justify-start gap-2 border border-dashed border-base-300 px-3 text-body font-medium text-base-content shadow-none transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
    >
      {disabled ? (
        <span className="loading loading-spinner loading-xs" />
      ) : (
        <Plus className="h-4 w-4" />
      )}
      New chat
    </button>
  )
}
