import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'

export type TaskState = 'active' | 'done' | 'scheduled'
export type LogTone = 'break' | 'warning' | 'active' | 'faded' | 'default'
export type TaskColorKey = 'blue' | 'green' | 'amber' | 'rose' | 'violet'
export type TaskIconKey = 'briefcase' | 'learning' | 'tools' | 'code' | 'book' | 'pen' | 'cart'

export interface Task {
  id: string
  title: string
  details: string
  statusText: string
  duration: string
  state: TaskState
  colorTag: TaskColorKey
  iconTag: TaskIconKey
}

export interface LogEntry {
  id: string
  date?: string
  start: string
  duration: string
  activity?: string
  taskId?: string
  tone?: LogTone
}

export interface SoundOption {
  id: string
  label: string
  icon: IconDefinition
}

export interface TimerPreset {
  timeLabel: string
  progress: number
}

export interface DashboardStats {
  sessions: number
  focusTime: string
  totalTracked: string
}
