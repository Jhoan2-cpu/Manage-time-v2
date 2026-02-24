import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import {
  faBookOpen,
  faBriefcase,
  faCartShopping,
  faCode,
  faGamepad,
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
  { id: 'game', label: 'Gaming', icon: faGamepad },
]

export const taskIconMap: Record<TaskIconKey, TaskIconOption> = {
  briefcase: taskIconOptions[0],
  learning: taskIconOptions[1],
  tools: taskIconOptions[2],
  code: taskIconOptions[3],
  book: taskIconOptions[4],
  pen: taskIconOptions[5],
  cart: taskIconOptions[6],
  game: taskIconOptions[7],
}

export const taskColorOptions: TaskColorOption[] = [
  {
    id: 'blue',
    label: 'Blue',
    swatchClassName: 'bg-blue-500',
    selectedRingClassName: 'ring-blue-300/80',
    cardClassName:
      'ring-1 ring-inset ring-blue-400/18 bg-blue-950/75 shadow-[inset_0_1px_0_rgba(148,163,184,0.05)]',
    iconShellClassName: 'border-blue-400/25 bg-blue-500/18 text-blue-100',
    badgeClassName: 'bg-blue-500/16 text-blue-100',
    pulseClassName: 'bg-blue-400',
  },
  {
    id: 'green',
    label: 'Green',
    swatchClassName: 'bg-emerald-500',
    selectedRingClassName: 'ring-emerald-300/80',
    cardClassName:
      'ring-1 ring-inset ring-emerald-400/16 bg-emerald-950/75 shadow-[inset_0_1px_0_rgba(148,163,184,0.05)]',
    iconShellClassName: 'border-emerald-400/25 bg-emerald-500/18 text-emerald-100',
    badgeClassName: 'bg-emerald-500/16 text-emerald-100',
    pulseClassName: 'bg-emerald-400',
  },
  {
    id: 'amber',
    label: 'Amber',
    swatchClassName: 'bg-amber-500',
    selectedRingClassName: 'ring-amber-300/80',
    cardClassName:
      'ring-1 ring-inset ring-amber-400/16 bg-amber-950/75 shadow-[inset_0_1px_0_rgba(148,163,184,0.05)]',
    iconShellClassName: 'border-amber-400/25 bg-amber-500/18 text-amber-100',
    badgeClassName: 'bg-amber-500/16 text-amber-100',
    pulseClassName: 'bg-amber-400',
  },
  {
    id: 'rose',
    label: 'Rose',
    swatchClassName: 'bg-rose-500',
    selectedRingClassName: 'ring-rose-300/80',
    cardClassName:
      'ring-1 ring-inset ring-rose-400/16 bg-rose-950/75 shadow-[inset_0_1px_0_rgba(148,163,184,0.05)]',
    iconShellClassName: 'border-rose-400/25 bg-rose-500/18 text-rose-100',
    badgeClassName: 'bg-rose-500/16 text-rose-100',
    pulseClassName: 'bg-rose-400',
  },
  {
    id: 'pink',
    label: 'Pink',
    swatchClassName: 'bg-pink-500',
    selectedRingClassName: 'ring-pink-300/80',
    cardClassName:
      'ring-1 ring-inset ring-pink-400/16 bg-pink-950/75 shadow-[inset_0_1px_0_rgba(148,163,184,0.05)]',
    iconShellClassName: 'border-pink-400/25 bg-pink-500/18 text-pink-100',
    badgeClassName: 'bg-pink-500/16 text-pink-100',
    pulseClassName: 'bg-pink-400',
  },
  {
    id: 'violet',
    label: 'Violet',
    swatchClassName: 'bg-violet-500',
    selectedRingClassName: 'ring-violet-300/80',
    cardClassName:
      'ring-1 ring-inset ring-violet-400/16 bg-violet-950/75 shadow-[inset_0_1px_0_rgba(148,163,184,0.05)]',
    iconShellClassName: 'border-violet-400/25 bg-violet-500/18 text-violet-100',
    badgeClassName: 'bg-violet-500/16 text-violet-100',
    pulseClassName: 'bg-violet-400',
  },
]

export const taskColorMap: Record<TaskColorKey, TaskColorOption> = {
  blue: taskColorOptions[0],
  green: taskColorOptions[1],
  amber: taskColorOptions[2],
  rose: taskColorOptions[3],
  pink: taskColorOptions[4],
  violet: taskColorOptions[5],
}
