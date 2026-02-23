import { Howl, Howler } from 'howler'

type UiSfxWindow = Window & {
  __focusFlowUiSfxInitialized__?: boolean
}

const UI_CLICK_SELECTOR = 'button, a[href], summary, input[type="button"], input[type="submit"]'
const EDITABLE_SELECTOR = 'textarea, [contenteditable="true"], input'
const TEXT_INPUT_TYPES = new Set([
  'text',
  'search',
  'email',
  'password',
  'url',
  'tel',
  'number',
])

let clickHowl: Howl | null = null
let typingHowl: Howl | null = null
let backgroundMusicHowl: Howl | null = null
const backgroundMusicListeners = new Set<(isPlaying: boolean) => void>()

const BACKGROUND_MUSIC_SRC_CANDIDATES = [
  encodeURI('/loop/Dark Ambient No Copyright Music  c152 - missed call.mp3'),
  '/loop/background.mp3',
]

export function initUiSfx() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return
  }

  const uiWindow = window as UiSfxWindow
  if (uiWindow.__focusFlowUiSfxInitialized__) {
    return
  }
  uiWindow.__focusFlowUiSfxInitialized__ = true

  Howler.autoUnlock = true
  Howler.autoSuspend = true

  clickHowl = new Howl({
    src: ['/public/sfx/click.mp3', '/sfx/click.mp3', createUiClickWavDataUri()],
    volume: 0.12,
    preload: true,
  })

  typingHowl = new Howl({
    src: [createTypingKeyWavDataUri()],
    volume: 0.06,
    preload: true,
  })

  backgroundMusicHowl = new Howl({
    src: BACKGROUND_MUSIC_SRC_CANDIDATES,
    volume: 0.08,
    loop: true,
    preload: true,
    html5: true,
    onplay: emitBackgroundMusicState,
    onpause: emitBackgroundMusicState,
    onstop: emitBackgroundMusicState,
    onend: emitBackgroundMusicState,
    onplayerror: emitBackgroundMusicState,
    onloaderror: emitBackgroundMusicState,
  })

  let lastPlayAt = 0
  let lastTypeAt = 0

  const onDocumentClick = (event: MouseEvent) => {
    const target = event.target
    if (!(target instanceof Element)) {
      return
    }

    if (target.closest('[data-sfx-click="off"]')) {
      return
    }

    const interactive = target.closest(UI_CLICK_SELECTOR)
    if (!(interactive instanceof HTMLElement)) {
      return
    }

    if (interactive.matches(':disabled') || interactive.getAttribute('aria-disabled') === 'true') {
      return
    }

    const now = performance.now()
    if (now - lastPlayAt < 45) {
      return
    }
    lastPlayAt = now

    playUiClick()
  }

  const onDocumentKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) {
      return
    }

    if (!shouldPlayTypingSfxForKey(event)) {
      return
    }

    const target = event.target
    if (!(target instanceof Element)) {
      return
    }

    if (target.closest('[data-sfx-type="off"]')) {
      return
    }

    if (!isEditableTarget(target)) {
      return
    }

    const now = performance.now()
    if (now - lastTypeAt < 16) {
      return
    }
    lastTypeAt = now

    playUiTyping()
  }

  document.addEventListener('click', onDocumentClick, true)
  document.addEventListener('keydown', onDocumentKeyDown, true)
}

export function playUiClick() {
  if (!clickHowl) {
    return
  }

  try {
    clickHowl.stop()
    clickHowl.play()
  } catch {
    // Ignore playback errors caused by platform autoplay restrictions.
  }
}

export function playUiTyping() {
  if (!typingHowl) {
    return
  }

  try {
    typingHowl.stop()
    typingHowl.play()
  } catch {
    // Ignore playback errors caused by platform autoplay restrictions.
  }
}

export function toggleBackgroundMusic() {
  if (!backgroundMusicHowl) {
    return false
  }

  try {
    if (backgroundMusicHowl.playing()) {
      backgroundMusicHowl.pause()
      emitBackgroundMusicState()
      return false
    }

    backgroundMusicHowl.play()
    emitBackgroundMusicState()
    return true
  } catch {
    emitBackgroundMusicState()
    return false
  }
}

export function getBackgroundMusicPlaying() {
  return Boolean(backgroundMusicHowl?.playing())
}

export function subscribeBackgroundMusicState(listener: (isPlaying: boolean) => void) {
  backgroundMusicListeners.add(listener)
  listener(getBackgroundMusicPlaying())

  return () => {
    backgroundMusicListeners.delete(listener)
  }
}

function emitBackgroundMusicState() {
  const isPlaying = getBackgroundMusicPlaying()
  backgroundMusicListeners.forEach((listener) => listener(isPlaying))
}

function createUiClickWavDataUri() {
  const sampleRate = 22050
  const durationSeconds = 0.028
  const sampleCount = Math.floor(sampleRate * durationSeconds)
  const samples = new Int16Array(sampleCount)

  for (let i = 0; i < sampleCount; i += 1) {
    const t = i / sampleRate
    const env = Math.exp(-120 * t)
    const clickTransient = Math.sin(2 * Math.PI * 2200 * t) * Math.exp(-280 * t) * 0.42
    const clickBody = Math.sin(2 * Math.PI * 880 * t) * Math.exp(-130 * t) * 0.28
    const lowTap = Math.sin(2 * Math.PI * 260 * t) * Math.exp(-95 * t) * 0.14
    const noise = pseudoRandom(i) * 0.08 * Math.exp(-240 * t)
    const value = clamp(clickTransient + clickBody + lowTap + noise, -1, 1) * env
    samples[i] = Math.round(value * 32767)
  }

  const wavBytes = encodePcm16MonoWav(samples, sampleRate)
  return `data:audio/wav;base64,${bytesToBase64(wavBytes)}`
}

function createTypingKeyWavDataUri() {
  const sampleRate = 22050
  const durationSeconds = 0.022
  const sampleCount = Math.floor(sampleRate * durationSeconds)
  const samples = new Int16Array(sampleCount)

  for (let i = 0; i < sampleCount; i += 1) {
    const t = i / sampleRate
    const env = Math.exp(-170 * t)
    const tick = Math.sin(2 * Math.PI * 1700 * t) * Math.exp(-260 * t) * 0.34
    const clack = Math.sin(2 * Math.PI * 950 * t) * Math.exp(-140 * t) * 0.19
    const noise = pseudoRandom(i + 777) * 0.07 * Math.exp(-220 * t)
    const value = clamp(tick + clack + noise, -1, 1) * env
    samples[i] = Math.round(value * 32767)
  }

  const wavBytes = encodePcm16MonoWav(samples, sampleRate)
  return `data:audio/wav;base64,${bytesToBase64(wavBytes)}`
}

function encodePcm16MonoWav(samples: Int16Array, sampleRate: number) {
  const dataSize = samples.length * 2
  const wav = new Uint8Array(44 + dataSize)
  const view = new DataView(wav.buffer)

  writeAscii(wav, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeAscii(wav, 8, 'WAVE')
  writeAscii(wav, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true) // byte rate
  view.setUint16(32, 2, true) // block align
  view.setUint16(34, 16, true) // bits/sample
  writeAscii(wav, 36, 'data')
  view.setUint32(40, dataSize, true)

  let offset = 44
  for (let i = 0; i < samples.length; i += 1) {
    view.setInt16(offset, samples[i], true)
    offset += 2
  }

  return wav
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function writeAscii(target: Uint8Array, offset: number, value: string) {
  for (let i = 0; i < value.length; i += 1) {
    target[offset + i] = value.charCodeAt(i)
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function pseudoRandom(seed: number) {
  const x = Math.sin((seed + 1) * 12.9898) * 43758.5453
  return (x - Math.floor(x)) * 2 - 1
}

function shouldPlayTypingSfxForKey(event: KeyboardEvent) {
  if (event.repeat) {
    return false
  }

  if (event.key.length === 1) {
    return true
  }

  return ['Backspace', 'Delete', 'Enter', 'Tab', ' '].includes(event.key)
}

function isEditableTarget(target: Element) {
  const editable = target.closest(EDITABLE_SELECTOR)
  if (!editable) {
    return false
  }

  if (editable instanceof HTMLTextAreaElement) {
    return !editable.disabled && !editable.readOnly
  }

  if (editable instanceof HTMLInputElement) {
    const type = (editable.type || 'text').toLowerCase()
    return TEXT_INPUT_TYPES.has(type) && !editable.disabled && !editable.readOnly
  }

  if (editable instanceof HTMLElement && editable.isContentEditable) {
    return true
  }

  return false
}
