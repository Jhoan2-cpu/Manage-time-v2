import { useState } from 'react'
import { getCurrentIntlLocaleTag } from '../../../i18n'
import type { NewTaskPayload } from '../components/tasks/NewTaskModal'
import type { Task } from '../types'

type UseTaskManagementStateParams = {
  initialTasks: Task[]
  scheduledPrefixLabel: string
}

export function useTaskManagementState({ initialTasks, scheduledPrefixLabel }: UseTaskManagementStateParams) {
  const [taskList, setTaskList] = useState<Task[]>(initialTasks)
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [taskPendingDelete, setTaskPendingDelete] = useState<Task | null>(null)

  const handleAddTask = () => {
    setEditingTask(null)
    setIsNewTaskModalOpen(true)
  }

  const handleCloseNewTaskModal = () => {
    setIsNewTaskModalOpen(false)
    setEditingTask(null)
  }

  const handleCreateTask = ({ title, details, colorTag, iconTag, targetDurationMinutes, alarmTime }: NewTaskPayload) => {
    if (editingTask) {
      setTaskList((currentTasks) =>
        currentTasks.map((task) =>
          task.id === editingTask.id
            ? {
                ...task,
                title,
                details: details.trim(),
                colorTag,
                iconTag,
                targetDurationMinutes,
                alarmTime,
              }
            : task,
        ),
      )
      return
    }

    const createdAtLabel = new Intl.DateTimeFormat(getCurrentIntlLocaleTag(), {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date())

    setTaskList((currentTasks) => [
      {
        id: `task-${crypto.randomUUID()}`,
        title,
        details: details.trim(),
        statusText: `${scheduledPrefixLabel}: ${createdAtLabel}`,
        duration: '00:00:00',
        state: 'scheduled',
        colorTag,
        iconTag,
        targetDurationMinutes,
        alarmTime,
      },
      ...currentTasks,
    ])
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setIsNewTaskModalOpen(true)
  }

  const handleRequestDeleteTask = (task: Task) => {
    setTaskPendingDelete(task)
  }

  const handleRequestDeleteFromTaskModal = (task: Task) => {
    setIsNewTaskModalOpen(false)
    setTaskPendingDelete(task)
  }

  const handleCloseDeleteTaskModal = () => {
    setTaskPendingDelete(null)
  }

  const cleanupTaskUiStateAfterDelete = (deletedTaskId: string) => {
    if (editingTask?.id === deletedTaskId) {
      setIsNewTaskModalOpen(false)
      setEditingTask(null)
    }
    setTaskPendingDelete(null)
  }

  return {
    taskList,
    setTaskList,
    isNewTaskModalOpen,
    editingTask,
    taskPendingDelete,
    handleAddTask,
    handleCloseNewTaskModal,
    handleCreateTask,
    handleEditTask,
    handleRequestDeleteTask,
    handleRequestDeleteFromTaskModal,
    handleCloseDeleteTaskModal,
    cleanupTaskUiStateAfterDelete,
  }
}
