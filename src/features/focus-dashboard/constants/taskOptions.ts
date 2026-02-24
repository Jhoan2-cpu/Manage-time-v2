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
      'ring-1 ring-inset ring-blue-100/10 backdrop-blur-[2px] bg-[radial-gradient(140%_92%_at_10%_4%,rgba(255,255,255,0.03),transparent_52%),radial-gradient(130%_110%_at_88%_100%,rgba(147,197,253,0.04),transparent_58%),linear-gradient(160deg,rgba(10,24,36,0.82)_0%,rgba(14,38,58,0.78)_42%,rgba(26,54,98,0.68)_100%)] shadow-[0_14px_28px_rgba(2,8,20,0.28),inset_0_1px_0_rgba(255,255,255,0.03),inset_0_-14px_24px_rgba(255,255,255,0.01)]',
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
      'ring-1 ring-inset ring-emerald-100/9 backdrop-blur-[2px] bg-[radial-gradient(140%_92%_at_10%_4%,rgba(255,255,255,0.03),transparent_52%),radial-gradient(130%_110%_at_88%_100%,rgba(110,231,183,0.04),transparent_58%),linear-gradient(160deg,rgba(8,28,28,0.82)_0%,rgba(11,44,42,0.78)_42%,rgba(18,66,62,0.68)_100%)] shadow-[0_14px_28px_rgba(2,8,20,0.28),inset_0_1px_0_rgba(255,255,255,0.03),inset_0_-14px_24px_rgba(255,255,255,0.01)]',
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
      'ring-1 ring-inset ring-amber-100/9 backdrop-blur-[2px] bg-[radial-gradient(140%_92%_at_10%_4%,rgba(255,255,255,0.03),transparent_52%),radial-gradient(130%_110%_at_88%_100%,rgba(253,230,138,0.04),transparent_58%),linear-gradient(160deg,rgba(32,22,10,0.84)_0%,rgba(49,35,14,0.80)_42%,rgba(78,57,20,0.70)_100%)] shadow-[0_14px_28px_rgba(2,8,20,0.28),inset_0_1px_0_rgba(255,255,255,0.03),inset_0_-14px_24px_rgba(255,255,255,0.01)]',
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
      'ring-1 ring-inset ring-rose-100/9 backdrop-blur-[2px] bg-[radial-gradient(140%_92%_at_10%_4%,rgba(255,255,255,0.03),transparent_52%),radial-gradient(130%_110%_at_88%_100%,rgba(253,164,175,0.035),transparent_58%),linear-gradient(160deg,rgba(26,18,24,0.84)_0%,rgba(42,27,36,0.80)_42%,rgba(68,42,56,0.70)_100%)] shadow-[0_14px_28px_rgba(2,8,20,0.28),inset_0_1px_0_rgba(255,255,255,0.03),inset_0_-14px_24px_rgba(255,255,255,0.01)]',
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
      'ring-1 ring-inset ring-pink-100/9 backdrop-blur-[2px] bg-[radial-gradient(140%_92%_at_10%_4%,rgba(255,255,255,0.03),transparent_52%),radial-gradient(130%_110%_at_88%_100%,rgba(249,168,212,0.04),transparent_58%),linear-gradient(160deg,rgba(25,20,34,0.84)_0%,rgba(39,29,48,0.80)_42%,rgba(64,46,79,0.70)_100%)] shadow-[0_14px_28px_rgba(2,8,20,0.28),inset_0_1px_0_rgba(255,255,255,0.03),inset_0_-14px_24px_rgba(255,255,255,0.01)]',
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
      'ring-1 ring-inset ring-violet-100/10 backdrop-blur-[2px] bg-[radial-gradient(140%_92%_at_10%_4%,rgba(255,255,255,0.03),transparent_52%),radial-gradient(130%_110%_at_88%_100%,rgba(196,181,253,0.04),transparent_58%),linear-gradient(160deg,rgba(18,19,40,0.86)_0%,rgba(30,33,58,0.82)_42%,rgba(49,55,91,0.72)_100%)] shadow-[0_14px_28px_rgba(2,8,20,0.28),inset_0_1px_0_rgba(255,255,255,0.03),inset_0_-14px_24px_rgba(255,255,255,0.01)]',
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
