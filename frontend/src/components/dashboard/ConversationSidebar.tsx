import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAppDispatch, useAppSelector } from '@/store'
import {
  createConversation,
  deleteConversation,
  fetchConversations,
  fetchPersonas,
  renameConversation,
  selectConversation,
} from '@/store/conversationsSlice'
import { NewChatButton } from '@/components/dashboard/NewChatButton'
import { ChatList } from '@/components/dashboard/ChatList'
import { PersonaPickerModal } from '@/components/dashboard/PersonaPickerModal'
import type { Conversation, Persona } from '@/types/conversation'

export function ConversationSidebar() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { conversations, selectedId, status, creating, personas, personasStatus } =
    useAppSelector((s) => s.conversations)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchConversations())
    }
  }, [status, dispatch])

  useEffect(() => {
    if (pickerOpen && personasStatus === 'idle') {
      dispatch(fetchPersonas())
    }
  }, [pickerOpen, personasStatus, dispatch])

  function openConversation(conv: Conversation) {
    dispatch(selectConversation(conv.id))
    navigate(`/chat/${conv.id}`)
  }

  function handleNewChat() {
    dispatch(selectConversation(null))
    setPickerOpen(true)
  }

  async function handlePick(persona: Persona) {
    setPickerOpen(false)
    const res = await dispatch(createConversation({ persona: persona.id }))
    if (res.meta.requestStatus === 'fulfilled') {
      navigate(`/chat/${(res.payload as Conversation).id}`)
    }
  }

  async function handleSkip() {
    const mentor = personas.find((p) => p.id === 'mentor')
    setPickerOpen(false)
    const res = await dispatch(createConversation({ persona: mentor?.id }))
    if (res.meta.requestStatus === 'fulfilled') {
      navigate(`/chat/${(res.payload as Conversation).id}`)
    }
  }

  function handleRename(id: string, title: string) {
    dispatch(renameConversation({ id, title }))
  }

  function handleDelete(id: string) {
    dispatch(deleteConversation(id))
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <NewChatButton onNewChat={handleNewChat} disabled={creating} />
      <ChatList
        chats={conversations}
        activeId={selectedId}
        status={status}
        onOpen={openConversation}
        onRename={handleRename}
        onDelete={handleDelete}
        onRetry={() => dispatch(fetchConversations())}
      />

      <PersonaPickerModal
        open={pickerOpen}
        personas={personas}
        loading={personasStatus === 'loading'}
        error={personasStatus === 'failed'}
        onPick={handlePick}
        onSkip={handleSkip}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  )
}