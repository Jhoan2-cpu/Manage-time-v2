import type { TaskColorKey } from '../../types'

export type TimerAccentStyle = {
  glowClassName: string
  panelBackgroundClassName: string
  timeGlowClassName: string
  dividerClassName: string
  totalValueClassName: string
  chipClassName: string
  blurClassName: string
  playButtonClassName: string
  playIconClassName: string
}

export const timerAccentStyles: Record<TaskColorKey, TimerAccentStyle> = {
  blue: {
    glowClassName: 'shadow-[0_0_40px_rgba(59,130,246,0.18)]',
    panelBackgroundClassName:
      'bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_50%),linear-gradient(180deg,rgba(8,16,34,0.94),rgba(5,12,25,0.94))]',
    timeGlowClassName: 'drop-shadow-[0_0_18px_rgba(59,130,246,0.18)]',
    dividerClassName: 'border-blue-500/15',
    totalValueClassName: 'text-blue-200',
    chipClassName: 'border-blue-500/20 bg-blue-500/8 text-blue-100',
    blurClassName: 'bg-blue-500/18',
    playButtonClassName:
      'border-blue-500/35 bg-blue-500/15 text-blue-100 shadow-[0_10px_28px_rgba(59,130,246,0.22)] hover:border-blue-400/50 hover:bg-blue-500/25',
    playIconClassName: 'text-blue-100',
  },
  green: {
    glowClassName: 'shadow-[0_0_40px_rgba(16,185,129,0.18)]',
    panelBackgroundClassName:
      'bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.10),transparent_50%),linear-gradient(180deg,rgba(8,16,34,0.94),rgba(5,12,25,0.94))]',
    timeGlowClassName: 'drop-shadow-[0_0_18px_rgba(16,185,129,0.18)]',
    dividerClassName: 'border-emerald-500/15',
    totalValueClassName: 'text-emerald-200',
    chipClassName: 'border-emerald-500/20 bg-emerald-500/8 text-emerald-100',
    blurClassName: 'bg-emerald-500/18',
    playButtonClassName:
      'border-emerald-500/35 bg-emerald-500/15 text-emerald-100 shadow-[0_10px_28px_rgba(16,185,129,0.2)] hover:border-emerald-400/50 hover:bg-emerald-500/25',
    playIconClassName: 'text-emerald-100',
  },
  amber: {
    glowClassName: 'shadow-[0_0_40px_rgba(245,158,11,0.18)]',
    panelBackgroundClassName:
      'bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.10),transparent_50%),linear-gradient(180deg,rgba(8,16,34,0.94),rgba(5,12,25,0.94))]',
    timeGlowClassName: 'drop-shadow-[0_0_18px_rgba(245,158,11,0.18)]',
    dividerClassName: 'border-amber-500/15',
    totalValueClassName: 'text-amber-200',
    chipClassName: 'border-amber-500/20 bg-amber-500/8 text-amber-100',
    blurClassName: 'bg-amber-500/18',
    playButtonClassName:
      'border-amber-500/35 bg-amber-500/15 text-amber-100 shadow-[0_10px_28px_rgba(245,158,11,0.2)] hover:border-amber-400/50 hover:bg-amber-500/25',
    playIconClassName: 'text-amber-100',
  },
  rose: {
    glowClassName: 'shadow-[0_0_40px_rgba(244,63,94,0.18)]',
    panelBackgroundClassName:
      'bg-[radial-gradient(circle_at_top,rgba(244,63,94,0.10),transparent_50%),linear-gradient(180deg,rgba(8,16,34,0.94),rgba(5,12,25,0.94))]',
    timeGlowClassName: 'drop-shadow-[0_0_18px_rgba(244,63,94,0.18)]',
    dividerClassName: 'border-rose-500/15',
    totalValueClassName: 'text-rose-200',
    chipClassName: 'border-rose-500/20 bg-rose-500/8 text-rose-100',
    blurClassName: 'bg-rose-500/18',
    playButtonClassName:
      'border-rose-500/35 bg-rose-500/15 text-rose-100 shadow-[0_10px_28px_rgba(244,63,94,0.2)] hover:border-rose-400/50 hover:bg-rose-500/25',
    playIconClassName: 'text-rose-100',
  },
  pink: {
    glowClassName: 'shadow-[0_0_40px_rgba(236,72,153,0.18)]',
    panelBackgroundClassName:
      'bg-[radial-gradient(circle_at_top,rgba(236,72,153,0.10),transparent_50%),linear-gradient(180deg,rgba(8,16,34,0.94),rgba(5,12,25,0.94))]',
    timeGlowClassName: 'drop-shadow-[0_0_18px_rgba(236,72,153,0.18)]',
    dividerClassName: 'border-pink-500/15',
    totalValueClassName: 'text-pink-200',
    chipClassName: 'border-pink-500/20 bg-pink-500/8 text-pink-100',
    blurClassName: 'bg-pink-500/18',
    playButtonClassName:
      'border-pink-500/35 bg-pink-500/15 text-pink-100 shadow-[0_10px_28px_rgba(236,72,153,0.2)] hover:border-pink-400/50 hover:bg-pink-500/25',
    playIconClassName: 'text-pink-100',
  },
  violet: {
    glowClassName: 'shadow-[0_0_40px_rgba(139,92,246,0.18)]',
    panelBackgroundClassName:
      'bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.10),transparent_50%),linear-gradient(180deg,rgba(8,16,34,0.94),rgba(5,12,25,0.94))]',
    timeGlowClassName: 'drop-shadow-[0_0_18px_rgba(139,92,246,0.18)]',
    dividerClassName: 'border-violet-500/15',
    totalValueClassName: 'text-violet-200',
    chipClassName: 'border-violet-500/20 bg-violet-500/8 text-violet-100',
    blurClassName: 'bg-violet-500/18',
    playButtonClassName:
      'border-violet-500/35 bg-violet-500/15 text-violet-100 shadow-[0_10px_28px_rgba(139,92,246,0.2)] hover:border-violet-400/50 hover:bg-violet-500/25',
    playIconClassName: 'text-violet-100',
  },
}

export const timerPlayGlowRgbByColor: Record<TaskColorKey, string> = {
  blue: '59,130,246',
  green: '16,185,129',
  amber: '245,158,11',
  rose: '244,63,94',
  pink: '236,72,153',
  violet: '139,92,246',
}
