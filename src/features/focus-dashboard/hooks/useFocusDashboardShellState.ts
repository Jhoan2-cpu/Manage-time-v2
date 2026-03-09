import { useEffect, useMemo, useState } from 'react'
import { getBrowserTimeZone, getSupportedTimeZones } from '../utils/time'
import type { AppBootstrapPreferences } from '../api'
import {
  getBackgroundMusicVolume,
  getTimerAlarmVolume,
  getUiInteractionSfxEnabled,
  getUiInteractionSfxVolume,
  setBackgroundMusicVolume,
  setTimerAlarmVolume,
  setUiInteractionSfxEnabled,
  setUiInteractionSfxVolume,
  subscribeBackgroundMusicState,
  subscribeTimerRingtoneState,
  toggleBackgroundMusic,
} from '../../../lib/audio/uiSfx'

const TIME_ZONE_STORAGE_KEY = 'velor.settings.timezone'
const AUTO_TIME_ZONE_STORAGE_KEY = 'velor.settings.timezone.auto'

type UseFocusDashboardShellStateParams = {
  onSignOut?: () => void
  initialPreferences?: AppBootstrapPreferences | null
}

export function useFocusDashboardShellState({ onSignOut, initialPreferences }: UseFocusDashboardShellStateParams) {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [isSignOutConfirmOpen, setIsSignOutConfirmOpen] = useState(false)
  const [isBackgroundMusicPlaying, setIsBackgroundMusicPlaying] = useState(false)
  const [isTimerAlarmPlaying, setIsTimerAlarmPlaying] = useState(false)
  const [uiInteractionSfxEnabled, setUiInteractionSfxEnabledState] = useState(() => getUiInteractionSfxEnabled())
  const [uiInteractionSfxVolume, setUiInteractionSfxVolumeState] = useState(() => getUiInteractionSfxVolume())
  const [backgroundMusicVolume, setBackgroundMusicVolumeState] = useState(() => getBackgroundMusicVolume())
  const [timerAlarmVolume, setTimerAlarmVolumeState] = useState(() => getTimerAlarmVolume())
  const [requireTaskSwitchConfirmation, setRequireTaskSwitchConfirmation] = useState(
    initialPreferences?.confirm_task_switch_enabled ?? true,
  )
  const [selectedTimeZone, setSelectedTimeZone] = useState(() => {
    if (typeof initialPreferences?.time_zone_name === 'string' && initialPreferences.time_zone_name.trim()) {
      return initialPreferences.time_zone_name.trim()
    }

    if (typeof window === 'undefined') {
      return 'UTC'
    }

    const stored = window.localStorage.getItem(TIME_ZONE_STORAGE_KEY)?.trim()
    return stored || getBrowserTimeZone()
  })
  const [autoDetectTimeZone, setAutoDetectTimeZone] = useState(() => {
    if (typeof initialPreferences?.time_zone_auto_detect === 'boolean') {
      return initialPreferences.time_zone_auto_detect
    }

    if (typeof window === 'undefined') {
      return true
    }

    const stored = window.localStorage.getItem(AUTO_TIME_ZONE_STORAGE_KEY)
    if (stored === '0') {
      return false
    }
    if (stored === '1') {
      return true
    }
    return true
  })
  const [isDailyLogOpen, setIsDailyLogOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1280 : true,
  )
  const [isFocusOnlyMode, setIsFocusOnlyMode] = useState(false)
  const [dailyLogTogglePulseKey, setDailyLogTogglePulseKey] = useState(0)

  const browserTimeZone = useMemo(() => getBrowserTimeZone(), [])
  const supportedTimeZones = useMemo(() => getSupportedTimeZones(), [])
  const timeZoneOptions = useMemo(() => {
    return supportedTimeZones.includes(selectedTimeZone)
      ? supportedTimeZones
      : [selectedTimeZone, ...supportedTimeZones.filter((timeZone) => timeZone !== selectedTimeZone)]
  }, [selectedTimeZone, supportedTimeZones])
  const effectiveTimeZone = autoDetectTimeZone ? browserTimeZone : selectedTimeZone

  useEffect(() => {
    return subscribeBackgroundMusicState(setIsBackgroundMusicPlaying)
  }, [])

  useEffect(() => {
    return subscribeTimerRingtoneState(setIsTimerAlarmPlaying)
  }, [])

  useEffect(() => {
    if (!initialPreferences) {
      return
    }

    setRequireTaskSwitchConfirmation(initialPreferences.confirm_task_switch_enabled)
    setAutoDetectTimeZone(initialPreferences.time_zone_auto_detect)
    if (typeof initialPreferences.time_zone_name === 'string' && initialPreferences.time_zone_name.trim()) {
      setSelectedTimeZone(initialPreferences.time_zone_name.trim())
    }
  }, [initialPreferences])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(TIME_ZONE_STORAGE_KEY, selectedTimeZone)
  }, [selectedTimeZone])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(AUTO_TIME_ZONE_STORAGE_KEY, autoDetectTimeZone ? '1' : '0')
  }, [autoDetectTimeZone])

  useEffect(() => {
    if (!isFocusOnlyMode) {
      return
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFocusOnlyMode(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isFocusOnlyMode])

  const handleOpenSettings = () => {
    setIsSettingsModalOpen(true)
  }

  const handleCloseSettings = () => {
    setIsSettingsModalOpen(false)
  }

  const handleToggleBackgroundMusic = () => {
    toggleBackgroundMusic()
  }

  const handleToggleUiInteractionSfx = (nextValue: boolean) => {
    const appliedValue = setUiInteractionSfxEnabled(nextValue)
    setUiInteractionSfxEnabledState(appliedValue)
  }

  const handleBackgroundMusicVolumeChange = (nextValue: number) => {
    const appliedVolume = setBackgroundMusicVolume(nextValue)
    setBackgroundMusicVolumeState(appliedVolume)
  }

  const handleUiInteractionSfxVolumeChange = (nextValue: number) => {
    const appliedVolume = setUiInteractionSfxVolume(nextValue)
    setUiInteractionSfxVolumeState(appliedVolume)
  }

  const handleTimerAlarmVolumeChange = (nextValue: number) => {
    const appliedVolume = setTimerAlarmVolume(nextValue)
    setTimerAlarmVolumeState(appliedVolume)
  }

  const handleToggleAutoDetectTimeZone = (nextValue: boolean) => {
    setAutoDetectTimeZone(nextValue)
  }

  const handleTimeZoneChange = (nextValue: string) => {
    setSelectedTimeZone(nextValue)
  }

  const handleOpenProfile = () => {
    setIsProfileModalOpen(true)
  }

  const handleCloseProfile = () => {
    setIsProfileModalOpen(false)
  }

  const handleRequestSignOut = () => {
    setIsSignOutConfirmOpen(true)
  }

  const handleCloseSignOutConfirm = () => {
    setIsSignOutConfirmOpen(false)
  }

  const handleConfirmSignOut = () => {
    setIsSignOutConfirmOpen(false)
    onSignOut?.()
  }

  const handleToggleDailyLog = () => {
    setDailyLogTogglePulseKey((current) => current + 1)
    setIsDailyLogOpen((current) => !current)
  }

  const handleEnterFocusOnlyMode = () => {
    setIsFocusOnlyMode(true)
  }

  const handleExitFocusOnlyMode = () => {
    setIsFocusOnlyMode(false)
  }

  return {
    isProfileModalOpen,
    isSettingsModalOpen,
    isSignOutConfirmOpen,
    isBackgroundMusicPlaying,
    isTimerAlarmPlaying,
    uiInteractionSfxEnabled,
    uiInteractionSfxVolume,
    backgroundMusicVolume,
    timerAlarmVolume,
    requireTaskSwitchConfirmation,
    setRequireTaskSwitchConfirmation,
    selectedTimeZone,
    autoDetectTimeZone,
    timeZoneOptions,
    effectiveTimeZone,
    isDailyLogOpen,
    isFocusOnlyMode,
    dailyLogTogglePulseKey,
    handleOpenSettings,
    handleCloseSettings,
    handleToggleBackgroundMusic,
    handleToggleUiInteractionSfx,
    handleUiInteractionSfxVolumeChange,
    handleBackgroundMusicVolumeChange,
    handleTimerAlarmVolumeChange,
    handleToggleAutoDetectTimeZone,
    handleTimeZoneChange,
    handleOpenProfile,
    handleCloseProfile,
    handleRequestSignOut,
    handleCloseSignOutConfirm,
    handleConfirmSignOut,
    handleToggleDailyLog,
    handleEnterFocusOnlyMode,
    handleExitFocusOnlyMode,
  }
}
