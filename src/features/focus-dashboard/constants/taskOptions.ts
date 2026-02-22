import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import {
  faBookOpen,
  faBriefcase,
  faCartShopping,
  faCode,
  faGraduationCap,
  faPen,
  faScrewdriverWrench,
} from '@fortawesome/free-solid-svg-icons'
import type { TaskColorKey, TaskIconKey } from '../types'

export type TaskIconOption = {
  id: TaskIconKey
  label: string
  icon: IconDefinition
}

export type TaskColorOption = {
  id: TaskColorKey
  label: string
  swatchClassName: string
  selectedRingClassName: string
  cardClassName: string
  iconShellClassName: string
  badgeClassName: string
  pulseClassName: string
}

export const taskIconOptions: TaskIconOption[] = [
  { id: 'briefcase', label: 'Work', icon: faBriefcase },
  { id: 'learning', label: 'Study', icon: faGraduationCap },
  { id: 'tools', label: 'Setup', icon: faScrewdriverWrench },
  { id: 'code', label: 'Code', icon: faCode },
  { id: 'book', label: 'Read', icon: faBookOpen },
  { id: 'pen', label: 'Write', icon: faPen },
  { id: 'cart', label: 'Errands', icon: faCartShopping },
]

export const taskIconMap: Record<TaskIconKey, TaskIconOption> = {
  briefcase: taskIconOptions[0],
  learning: taskIconOptions[1],
  tools: taskIconOptions[2],
  code: taskIconOptions[3],
  book: taskIconOptions[4],
  pen: taskIconOptions[5],
  cart: taskIconOptions[6],
}

export const taskColorOptions: TaskColorOption[] = [
  {
    id: 'blue',
    label: 'Blue',
    swatchClassName: 'bg-blue-500',
    selectedRingClassName: 'ring-blue-300/80',
    cardClassName: 'border-blue-500/35 bg-gradient-to-br from-blue-500/15 via-slate-900/85 to-slate-950/95',
    iconShellClassName: 'border-blue-400/40 bg-blue-500/20 text-blue-100',
    badgeClassName: 'bg-blue-500/20 text-blue-100',
    pulseClassName: 'bg-blue-400',
  },
  {
    id: 'green',
    label: 'Green',
    swatchClassName: 'bg-emerald-500',
    selectedRingClassName: 'ring-emerald-300/80',
    cardClassName:
      'border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 via-slate-900/85 to-slate-950/95',
    iconShellClassName: 'border-emerald-400/40 bg-emerald-500/20 text-emerald-100',
    badgeClassName: 'bg-emerald-500/20 text-emerald-100',
    pulseClassName: 'bg-emerald-400',
  },
  {
    id: 'amber',
    label: 'Amber',
    swatchClassName: 'bg-amber-500',
    selectedRingClassName: 'ring-amber-300/80',
    cardClassName: 'border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-slate-900/85 to-slate-950/95',
    iconShellClassName: 'border-amber-400/40 bg-amber-500/20 text-amber-100',
    badgeClassName: 'bg-amber-500/20 text-amber-100',
    pulseClassName: 'bg-amber-400',
  },
  {
    id: 'rose',
    label: 'Rose',
    swatchClassName: 'bg-rose-500',
    selectedRingClassName: 'ring-rose-300/80',
    cardClassName: 'border-rose-500/30 bg-gradient-to-br from-rose-500/15 via-slate-900/85 to-slate-950/95',
    iconShellClassName: 'border-rose-400/40 bg-rose-500/20 text-rose-100',
    badgeClassName: 'bg-rose-500/20 text-rose-100',
    pulseClassName: 'bg-rose-400',
  },
  {
    id: 'violet',
    label: 'Violet',
    swatchClassName: 'bg-violet-500',
    selectedRingClassName: 'ring-violet-300/80',
    cardClassName:
      'border-violet-500/30 bg-gradient-to-br from-violet-500/15 via-slate-900/85 to-slate-950/95',
    iconShellClassName: 'border-violet-400/40 bg-violet-500/20 text-violet-100',
    badgeClassName: 'bg-violet-500/20 text-violet-100',
    pulseClassName: 'bg-violet-400',
  },
]

export const taskColorMap: Record<TaskColorKey, TaskColorOption> = {
  blue: taskColorOptions[0],
  green: taskColorOptions[1],
  amber: taskColorOptions[2],
  rose: taskColorOptions[3],
  violet: taskColorOptions[4],
}
