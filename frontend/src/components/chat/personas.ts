import { BarChart3, Blocks, BookOpen, GraduationCap, Layers, MessageCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import axiosClient from '@/lib/axios'

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

function cacheCustomPersona(p: CustomPersona) {
  const list = getCustomPersonas().filter((x) => x.id !== p.id)
  list.push(p)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

/** Load server-owned personas into the local cache used by the persona bar. */
export async function syncCustomPersonas() {
  const { data } = await axiosClient.get<CustomPersona[]>('/conversations/personas/custom')
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  return data
}

/** Create a persona for the current user, then update the local UI cache. */
export async function saveCustomPersona(
  p: Omit<CustomPersona, 'id'>,
): Promise<CustomPersona> {
  const { data } = await axiosClient.post<CustomPersona>('/conversations/personas/custom', p)
  cacheCustomPersona(data)
  return data
}
