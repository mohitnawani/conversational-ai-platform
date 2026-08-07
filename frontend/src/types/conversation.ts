export interface Conversation {
  id: string
  title: string
  memory_type: string
  persona: string
  created_at: string
  updated_at: string
  message_count: number
}

/**
 * A cited source behind a grounded answer — the "index card" the librarian
 * pulls to back the reply. Optional: the API supplies it when retrieval ran.
 */
export interface Source {
  id?: string
  fileName: string
  /** page or timestamp reference (e.g. "12" or "00:14:32") */
  chunk?: string
  /** short extracted passage, 3 lines in the drawer */
  excerpt?: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  token_count: number
  created_at: string
  /** Present only when the answer was grounded in retrieved sources. */
  sources?: Source[] | null
}

export interface Persona {
  id: string
  name: string
  description: string
  default_memory_type: string
}

export interface MemoryEntity {
  id: string
  name: string
  type: string
  description: string
}

export interface GraphNode {
  id: string
  label: string
}

export interface GraphEdge {
  source: string
  target: string
  predicate: string
}

export interface MemoryInsights {
  memory_type: string
  entities: MemoryEntity[]
  graph: { nodes: GraphNode[]; edges: GraphEdge[] }
  summary: { text: string; created_at: string } | null
  tokens: { total: number; user: number; assistant: number; messages: number }
}
