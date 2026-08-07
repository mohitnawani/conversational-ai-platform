import { BarChart3, Blocks, BookOpen, GraduationCap, Layers, MessageCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface CustomPersona {
  id: string
  name: string
  system?: string
  icon: number
}

export const STORAGE_KEY = 'mnemo:customPersonas'
export const CUSTOM_EVENT = 'mnemo:personas-changed'

export const PERSONA_ICONS: LucideIcon[] = [
  BookOpen,
  GraduationCap,
  BarChart3,
  Layers,
  Blocks,
  MessageCircle,
]

/** one clean line icon per built-in persona (by backend id) */
export const PERSONA_ICON_BY_ID: Record<string, LucideIcon> = {
  mentor: BookOpen,
  teacher: GraduationCap,
  analyst: BarChart3,
  architect: Layers,
  buddy: MessageCircle,
}

export function personaIcon(id: string): LucideIcon {
  return PERSONA_ICON_BY_ID[id] ?? MessageCircle
}

export function getCustomPersonas(): CustomPersona[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as CustomPersona[]
  } catch {
    return []
  }
}

export function saveCustomPersona(p: CustomPersona) {
  const list = getCustomPersonas().filter((x) => x.id !== p.id)
  list.push(p)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}