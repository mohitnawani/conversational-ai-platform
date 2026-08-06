export interface Conversation {
  id: string
  title: string
  memory_type: string
  persona: string
  created_at: string
  updated_at: string
  message_count: number
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  token_count: number
  created_at: string
}

export interface Persona {
  id: string
  name: string
  description: string
  default_memory_type: string
}