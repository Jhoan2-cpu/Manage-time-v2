import { faDroplet, faMugHot, faTree, faWater } from '@fortawesome/free-solid-svg-icons'
import type { DashboardStats, LogEntry, SoundOption, Task, TimerPreset } from '../types'

const TODAY_LOG_DATE = '2026-02-22'

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
    targetDurationMinutes: 25,
    alarmTime: '09:15',
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
    targetDurationMinutes: 45,
    alarmTime: '08:00',
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
    targetDurationMinutes: 90,
    alarmTime: '14:00',
  },
]

export const logEntries: LogEntry[] = [
  { id: 'log-1', date: TODAY_LOG_DATE, start: '8:00 AM', duration: '45 min', taskId: 'task-email-cleanup' },
  { id: 'log-2', date: TODAY_LOG_DATE, start: '9:15 AM', duration: '25 min', taskId: 'task-q3-report' },
  { id: 'log-3', date: TODAY_LOG_DATE, start: '9:45 AM', duration: '20 min', taskId: 'task-email-cleanup' },
  { id: 'log-4', date: TODAY_LOG_DATE, start: '10:20 AM', duration: '40 min', taskId: 'task-q3-report' },
  { id: 'log-5', date: TODAY_LOG_DATE, start: '11:30 AM', duration: '30 min', taskId: 'task-design-review' },
  { id: 'log-6', date: TODAY_LOG_DATE, start: '1:10 PM', duration: '35 min', taskId: 'task-q3-report' },
  { id: 'log-7', date: TODAY_LOG_DATE, start: '2:00 PM', duration: '1:30 hrs', taskId: 'task-design-review' },
  { id: 'log-8', date: TODAY_LOG_DATE, start: '4:10 PM', duration: '15 min', taskId: 'task-email-cleanup' },
  { id: 'log-9', date: TODAY_LOG_DATE, start: '5:00 PM', duration: '50 min', taskId: 'task-q3-report' },
  { id: 'log-10', date: TODAY_LOG_DATE, start: '6:10 PM', duration: '30 min', taskId: 'task-design-review' },
]

export const historyLogEntries: LogEntry[] = [
  ...logEntries,
  { id: 'log-11', date: '2026-02-21', start: '7:50 AM', duration: '35 min', taskId: 'task-email-cleanup' },
  { id: 'log-12', date: '2026-02-21', start: '8:40 AM', duration: '25 min', taskId: 'task-q3-report' },
  { id: 'log-13', date: '2026-02-21', start: '9:20 AM', duration: '45 min', taskId: 'task-design-review' },
  { id: 'log-14', date: '2026-02-21', start: '11:00 AM', duration: '20 min', taskId: 'task-email-cleanup' },
  { id: 'log-15', date: '2026-02-21', start: '2:15 PM', duration: '1:00 hrs', taskId: 'task-q3-report' },
  { id: 'log-16', date: '2026-02-20', start: '8:10 AM', duration: '30 min', taskId: 'task-design-review' },
  { id: 'log-17', date: '2026-02-20', start: '9:00 AM', duration: '25 min', taskId: 'task-q3-report' },
  { id: 'log-18', date: '2026-02-20', start: '10:15 AM', duration: '50 min', taskId: 'task-design-review' },
  { id: 'log-19', date: '2026-02-20', start: '1:30 PM', duration: '40 min', taskId: 'task-email-cleanup' },
  { id: 'log-20', date: '2026-02-20', start: '3:20 PM', duration: '35 min', taskId: 'task-q3-report' },
  { id: 'log-21', date: '2026-02-19', start: '8:30 AM', duration: '45 min', taskId: 'task-q3-report' },
  { id: 'log-22', date: '2026-02-19', start: '9:35 AM', duration: '15 min', taskId: 'task-email-cleanup' },
  { id: 'log-23', date: '2026-02-19', start: '10:00 AM', duration: '1:20 hrs', taskId: 'task-design-review' },
  { id: 'log-24', date: '2026-02-19', start: '1:00 PM', duration: '25 min', taskId: 'task-q3-report' },
  { id: 'log-25', date: '2026-02-18', start: '11:15 AM', duration: '30 min', taskId: 'task-email-cleanup' },
  { id: 'log-26', date: '2026-02-18', start: '12:00 PM', duration: '35 min', taskId: 'task-design-review' },
  { id: 'log-27', date: '2026-02-18', start: '2:40 PM', duration: '55 min', taskId: 'task-q3-report' },
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
