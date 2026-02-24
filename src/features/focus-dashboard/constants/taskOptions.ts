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
      'ring-1 ring-inset ring-blue-300/42 bg-[radial-gradient(130%_88%_at_12%_0%,rgba(147,197,253,0.22),transparent_50%),radial-gradient(120%_120%_at_100%_100%,rgba(37,99,235,0.16),transparent_62%),linear-gradient(155deg,#10265f_0%,#1c449f_46%,#0a173f_100%)] shadow-[0_12px_24px_rgba(2,6,23,0.18),inset_0_1px_0_rgba(219,234,254,0.08),inset_0_-18px_28px_rgba(2,6,23,0.22)]',
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
      'ring-1 ring-inset ring-emerald-300/40 bg-[radial-gradient(130%_88%_at_12%_0%,rgba(110,231,183,0.18),transparent_50%),radial-gradient(120%_120%_at_100%_100%,rgba(16,185,129,0.15),transparent_62%),linear-gradient(155deg,#05392f_0%,#066454_44%,#021b17_100%)] shadow-[0_12px_24px_rgba(2,6,23,0.18),inset_0_1px_0_rgba(209,250,229,0.06),inset_0_-18px_28px_rgba(2,6,23,0.22)]',
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
      'ring-1 ring-inset ring-amber-300/40 bg-[radial-gradient(130%_88%_at_12%_0%,rgba(253,230,138,0.18),transparent_50%),radial-gradient(120%_120%_at_100%_100%,rgba(245,158,11,0.14),transparent_62%),linear-gradient(155deg,#4b2302_0%,#8a3f05_44%,#251103_100%)] shadow-[0_12px_24px_rgba(2,6,23,0.18),inset_0_1px_0_rgba(254,243,199,0.06),inset_0_-18px_28px_rgba(2,6,23,0.22)]',
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
      'ring-1 ring-inset ring-rose-300/40 bg-[radial-gradient(130%_88%_at_12%_0%,rgba(253,164,175,0.18),transparent_50%),radial-gradient(120%_120%_at_100%_100%,rgba(244,63,94,0.14),transparent_62%),linear-gradient(155deg,#4f0821_0%,#97133a_44%,#270711_100%)] shadow-[0_12px_24px_rgba(2,6,23,0.18),inset_0_1px_0_rgba(254,205,211,0.06),inset_0_-18px_28px_rgba(2,6,23,0.22)]',
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
      'ring-1 ring-inset ring-pink-300/40 bg-[radial-gradient(130%_88%_at_12%_0%,rgba(249,168,212,0.18),transparent_50%),radial-gradient(120%_120%_at_100%_100%,rgba(236,72,153,0.15),transparent_62%),linear-gradient(155deg,#531032_0%,#a11663_44%,#2c0a1b_100%)] shadow-[0_12px_24px_rgba(2,6,23,0.18),inset_0_1px_0_rgba(251,207,232,0.06),inset_0_-18px_28px_rgba(2,6,23,0.22)]',
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
      'ring-1 ring-inset ring-violet-300/42 bg-[radial-gradient(130%_88%_at_12%_0%,rgba(196,181,253,0.2),transparent_50%),radial-gradient(120%_120%_at_100%_100%,rgba(139,92,246,0.16),transparent_62%),linear-gradient(155deg,#2f146c_0%,#5d2cc7_44%,#170a34_100%)] shadow-[0_12px_24px_rgba(2,6,23,0.18),inset_0_1px_0_rgba(233,213,255,0.07),inset_0_-18px_28px_rgba(2,6,23,0.22)]',
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
