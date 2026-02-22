import { faDroplet, faMugHot, faTree, faWater } from '@fortawesome/free-solid-svg-icons'
import type { DashboardStats, LogEntry, SoundOption, Task, TimerPreset } from '../types'

export const tasks: Task[] = [
  {
    id: 'task-q3-report',
    title: 'Q3 Report Writing',
    details: 'Drafting financial summary section',
    statusText: 'Started: 9:15 AM',
    duration: '00:25:00',
    state: 'active',
    colorTag: 'blue',
    iconTag: 'briefcase',
  },
  {
    id: 'task-email-cleanup',
    title: 'Email Cleanup',
    details: 'Inbox zero goal for the week',
    statusText: 'Done: 8:00 AM - 8:45 AM',
    duration: '00:45:00',
    state: 'done',
    colorTag: 'green',
    iconTag: 'pen',
  },
  {
    id: 'task-design-review',
    title: 'Design Review',
    details: 'Meeting notes and feedback compilation',
    statusText: 'Scheduled: 2:00 PM',
    duration: '01:30:00',
    state: 'scheduled',
    colorTag: 'violet',
    iconTag: 'learning',
  },
]

export const logEntries: LogEntry[] = [
  { id: 'log-1', start: '10:00 AM', duration: '10 min', activity: 'Descanso', tone: 'break' },
  {
    id: 'log-2',
    start: '10:10 AM',
    duration: '10 min',
    activity: 'Cocina y Lavanderia',
    tone: 'default',
  },
  {
    id: 'log-3',
    start: '11:40 AM',
    duration: '1:20 hrs',
    activity: 'BUSQUEDA EMPLEO',
    tone: 'warning',
  },
  {
    id: 'log-4',
    start: '1:00 PM',
    duration: '1:20 hrs',
    activity: 'COMER, LAVAR PLATO...',
    tone: 'default',
  },
  {
    id: 'log-5',
    start: '2:40 PM',
    duration: '1:40 hrs',
    activity: 'LAVANDERIA, BANO...',
    tone: 'default',
  },
  {
    id: 'log-6',
    start: '5:15 PM',
    duration: '2:45 hrs',
    activity: 'PASAJE HASTA SANT.',
    tone: 'warning',
  },
  { id: 'log-7', start: '6:15 PM', duration: '1 hr', activity: 'JUEGUITOS', tone: 'warning' },
  { id: 'log-8', start: '6:25 PM', duration: '10 min', activity: 'Descanso', tone: 'break' },
  { id: 'log-9', start: '6:50 PM', duration: '25 min', activity: 'ingles', tone: 'default' },
  {
    id: 'log-10',
    start: '7:25 PM',
    duration: '35 min',
    activity: 'ENTRETENIMIENTO',
    tone: 'active',
  },
  { id: 'log-11', start: '8:14 PM', duration: '49 min', activity: 'ingles', tone: 'faded' },
  {
    id: 'log-12',
    start: '9:50 PM',
    duration: '1:36 hrs',
    activity: 'DESCANSO',
    tone: 'faded',
  },
]

export const soundOptions: SoundOption[] = [
  { id: 'rain', label: 'Rain', icon: faDroplet },
  { id: 'forest', label: 'Forest', icon: faTree },
  { id: 'cafe', label: 'Cafe', icon: faMugHot },
  { id: 'waves', label: 'Waves', icon: faWater },
]

export const timerPreset: TimerPreset = {
  timeLabel: '25:00',
  progress: 75,
}

export const dashboardStats: DashboardStats = {
  sessions: 4,
  focusTime: '1h 40m',
  totalTracked: '10h 42m',
}
