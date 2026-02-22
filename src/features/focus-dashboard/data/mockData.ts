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
  { id: 'log-1', start: '8:00 AM', duration: '45 min', taskId: 'task-email-cleanup' },
  { id: 'log-2', start: '9:15 AM', duration: '25 min', taskId: 'task-q3-report' },
  { id: 'log-3', start: '9:45 AM', duration: '20 min', taskId: 'task-email-cleanup' },
  { id: 'log-4', start: '10:20 AM', duration: '40 min', taskId: 'task-q3-report' },
  { id: 'log-5', start: '11:30 AM', duration: '30 min', taskId: 'task-design-review' },
  { id: 'log-6', start: '1:10 PM', duration: '35 min', taskId: 'task-q3-report' },
  { id: 'log-7', start: '2:00 PM', duration: '1:30 hrs', taskId: 'task-design-review' },
  { id: 'log-8', start: '4:10 PM', duration: '15 min', taskId: 'task-email-cleanup' },
  { id: 'log-9', start: '5:00 PM', duration: '50 min', taskId: 'task-q3-report' },
  { id: 'log-10', start: '6:10 PM', duration: '30 min', taskId: 'task-design-review' },
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
