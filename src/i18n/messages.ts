export const messages = {
  es: {
    common: {
      brand: {
        focusWorkspace: 'Espacio de enfoque',
      },
      actions: {
        back: 'Atras',
        logIn: 'Iniciar sesion',
        register: 'Registrarse',
      },
      languageNames: {
        es: 'Español',
        en: 'Inglés',
      },
    },
    home: {
      heroEyebrow: 'Enfoque profundo, registros claros',
      heroTitle: 'Registra trabajo enfocado sin perder el dia.',
      heroDescription:
        'Velor combina sesiones de enfoque por tarea, un registro diario limpio y un historial de sesiones en un solo espacio de trabajo disenado para claridad y velocidad.',
      ctaOpenWorkspace: 'Abrir espacio de trabajo',
      ctaStartWithVelor: 'Empezar con Velor',
      previewTitle: 'Vista previa de Velor',
      previewSubtitle: 'Espacio de enfoque',
      previewLive: 'En vivo',
      previewTrackedToday: 'Registrado hoy',
      previewUntrackedTime: 'Tiempo no registrado',
      featureDualTimerTitle: 'Temporizador dual',
      featureDualTimerSubtitle: 'Cronometro o cuenta regresiva',
      featureDailyLogTitle: 'Registro diario',
      featureDailyLogSubtitle: 'Copia y seleccion estilo Excel',
      featureTaskQueueTitle: 'Cola de tareas',
      featureTaskQueueSubtitle: 'Tarjetas de enfoque por color',
      previewTaskTitle: 'Planificacion de producto',
      previewTaskStatus: 'Vista previa',
    },
    auth: {
      login: {
        welcomeBackFallback: 'Bienvenido de nuevo',
        errors: {
          missingFields: 'Ingresa tu correo y contrasena.',
          invalidEmail: 'Ingresa un correo valido.',
        },
        heroEyebrow: 'Espacio de enfoque',
        heroTitle: 'Inicia sesion para retomar tu flujo.',
        heroDescription:
          'Continua registrando sesiones de trabajo enfocadas, revisa tu registro diario y gestiona tareas dentro de tu espacio Velor.',
        metricSessionModeLabel: 'Modo de sesion',
        metricSessionModeValue: 'Temporizador + Cronometro',
        metricDailyLogLabel: 'Registro diario',
        metricDailyLogValue: 'Listo para Excel',
        metricWorkspaceLabel: 'Espacio de trabajo',
        metricWorkspaceValue: 'Guiado por tareas',
        cardTitle: 'Iniciar sesion',
        cardSubtitle: 'Accede a tu espacio de enfoque.',
        workspaceLabel: 'Espacio de trabajo',
        workspaceSubtitle: 'Espacio personal de Velor',
        fieldEmail: 'Correo',
        fieldPassword: 'Contrasena',
        emailPlaceholder: 'tu@velor.app',
        passwordPlaceholder: 'Ingresa tu contrasena',
        showPassword: 'Mostrar contrasena',
        hidePassword: 'Ocultar contrasena',
        continueWithGoogle: 'Continuar con Google',
        enterVelor: 'Entrar a Velor',
        demoNotice: 'Demo habilitada. Cualquier correo y contrasena validos abriran el dashboard.',
        needAccount: 'Necesitas una cuenta?',
        createOne: 'Crear una',
      },
      register: {
        newWorkspaceFallback: 'Nuevo espacio',
        errors: {
          missingFields: 'Completa todos los campos obligatorios.',
          invalidEmail: 'Ingresa un correo valido.',
          shortPassword: 'La contrasena debe tener al menos 6 caracteres.',
          passwordMismatch: 'Las contrasenas no coinciden.',
        },
        heroEyebrow: 'Crear espacio',
        heroTitle: 'Crea tu cuenta y empieza a registrar.',
        heroDescription:
          'Configura tu espacio Velor para gestionar tareas, ejecutar sesiones de enfoque y mantener un registro diario limpio desde el primer dia.',
        metricOnboardingLabel: 'Inicio',
        metricOnboardingValue: 'Configuracion rapida',
        metricSignInLabel: 'Ingreso',
        metricSignInValue: 'Correo o Google',
        metricWorkspaceLabel: 'Espacio de trabajo',
        metricWorkspaceValue: 'Listo hoy',
        cardTitle: 'Registro',
        cardSubtitle: 'Crea tu cuenta de Velor.',
        workspaceLabel: 'Espacio de trabajo',
        workspaceSubtitle: 'Espacio personal de Velor',
        fieldDisplayName: 'Nombre visible',
        fieldEmail: 'Correo',
        fieldPassword: 'Contrasena',
        fieldConfirmPassword: 'Confirmar contrasena',
        displayNamePlaceholder: 'Anton Rivera',
        emailPlaceholder: 'tu@velor.app',
        passwordPlaceholder: 'Minimo 6 caracteres',
        confirmPasswordPlaceholder: 'Repite la contrasena',
        showPassword: 'Mostrar contrasena',
        hidePassword: 'Ocultar contrasena',
        signUpWithGoogle: 'Registrarse con Google',
        createAccount: 'Crear cuenta',
        demoNotice: 'Registro demo habilitado. Esto crea solo una sesion local.',
        alreadyHaveAccount: 'Ya tienes una cuenta?',
        logIn: 'Iniciar sesion',
      },
    },
    settings: {
      panelTitle: 'Configuración',
      language: {
        title: 'Idioma',
        description: 'Elige el idioma que prefieres para usar Velor.',
        defaultBadge: 'Predeterminado: Español',
      },
      uiSounds: {
        label: 'Sonidos UI (Click + Escritura)',
        description: 'Reproduce sonidos cortos al hacer clic o escribir para tener respuesta de la interfaz.',
      },
      musicVolume: {
        label: 'Volumen de Música de Fondo',
        description: 'Controla el volumen de la música de fondo mientras trabajas.',
      },
      taskSwitchConfirm: {
        label: 'Confirmar Cambio de Tarea',
        description: 'Evita cambios accidentales: pide confirmación si ya hay una tarea en ejecución.',
      },
      timeZone: {
        title: 'Zona Horaria',
        description: 'Define la hora que se muestra en el reloj y en los nuevos registros.',
        autoDetectLabel: 'Detectar Zona Horaria Automáticamente',
        currentDescription: 'Zona en uso: {timeZone}',
        manualTitle: 'Zona Horaria Manual',
        optionsCount: '{count} opciones',
        searchPlaceholder: 'Buscar zona horaria...',
        noMatches: 'No hay zonas horarias que coincidan con tu búsqueda.',
        disableAutoHint: 'Desactiva la detección automática para elegir otra zona horaria manualmente.',
        activeHint: 'Zona seleccionada: {timeZone}',
      },
      signOutConfirmation: {
        title: 'Confirmación al Cerrar Sesión',
        description:
          'Por seguridad, al cerrar sesión se te pedirá confirmación antes de salir de tu cuenta.',
      },
    },
  },
  en: {
    common: {
      brand: {
        focusWorkspace: 'Focus Workspace',
      },
      actions: {
        back: 'Back',
        logIn: 'Log In',
        register: 'Register',
      },
      languageNames: {
        es: 'Spanish',
        en: 'English',
      },
    },
    home: {
      heroEyebrow: 'Deep Focus, Clear Logs',
      heroTitle: 'Track focused work without losing the day.',
      heroDescription:
        'Velor combines task-based focus sessions, a clean Daily Log, and session history in one workspace designed for clarity and speed.',
      ctaOpenWorkspace: 'Open Workspace',
      ctaStartWithVelor: 'Start with Velor',
      previewTitle: 'Velor Preview',
      previewSubtitle: 'Focus workspace',
      previewLive: 'Live',
      previewTrackedToday: 'Tracked Today',
      previewUntrackedTime: 'Untracked Time',
      featureDualTimerTitle: 'Dual Timer',
      featureDualTimerSubtitle: 'Stopwatch or countdown mode',
      featureDailyLogTitle: 'Daily Log',
      featureDailyLogSubtitle: 'Excel-style copy and selection',
      featureTaskQueueTitle: 'Task Queue',
      featureTaskQueueSubtitle: 'Color-coded focus cards',
      previewTaskTitle: 'Product Planning',
      previewTaskStatus: 'Preview',
    },
    auth: {
      login: {
        welcomeBackFallback: 'Welcome back',
        errors: {
          missingFields: 'Enter your email and password.',
          invalidEmail: 'Enter a valid email address.',
        },
        heroEyebrow: 'Focus Workspace',
        heroTitle: 'Sign in to resume your flow.',
        heroDescription:
          'Continue tracking focused work sessions, review your Daily Log, and manage tasks inside your Velor workspace.',
        metricSessionModeLabel: 'Session Mode',
        metricSessionModeValue: 'Timer + Stopwatch',
        metricDailyLogLabel: 'Daily Log',
        metricDailyLogValue: 'Excel-ready',
        metricWorkspaceLabel: 'Workspace',
        metricWorkspaceValue: 'Task-driven',
        cardTitle: 'Log In',
        cardSubtitle: 'Access your focus workspace.',
        workspaceLabel: 'Workspace',
        workspaceSubtitle: 'Velor personal workspace',
        fieldEmail: 'Email',
        fieldPassword: 'Password',
        emailPlaceholder: 'you@velor.app',
        passwordPlaceholder: 'Enter your password',
        showPassword: 'Show password',
        hidePassword: 'Hide password',
        continueWithGoogle: 'Continue with Google',
        enterVelor: 'Enter Velor',
        demoNotice: 'Demo login enabled. Any valid email and password will open the dashboard.',
        needAccount: 'Need an account?',
        createOne: 'Create one',
      },
      register: {
        newWorkspaceFallback: 'New workspace',
        errors: {
          missingFields: 'Complete all required fields.',
          invalidEmail: 'Enter a valid email address.',
          shortPassword: 'Password must be at least 6 characters.',
          passwordMismatch: 'Passwords do not match.',
        },
        heroEyebrow: 'Create Workspace',
        heroTitle: 'Create your account and start tracking.',
        heroDescription:
          'Set up your Velor workspace to manage tasks, run focus sessions, and keep a clean Daily Log from the first day.',
        metricOnboardingLabel: 'Onboarding',
        metricOnboardingValue: 'Fast setup',
        metricSignInLabel: 'Sign In',
        metricSignInValue: 'Email or Google',
        metricWorkspaceLabel: 'Workspace',
        metricWorkspaceValue: 'Ready today',
        cardTitle: 'Register',
        cardSubtitle: 'Create your Velor account.',
        workspaceLabel: 'Workspace',
        workspaceSubtitle: 'Velor personal workspace',
        fieldDisplayName: 'Display Name',
        fieldEmail: 'Email',
        fieldPassword: 'Password',
        fieldConfirmPassword: 'Confirm Password',
        displayNamePlaceholder: 'Anton Rivera',
        emailPlaceholder: 'you@velor.app',
        passwordPlaceholder: 'Min 6 characters',
        confirmPasswordPlaceholder: 'Repeat password',
        showPassword: 'Show password',
        hidePassword: 'Hide password',
        signUpWithGoogle: 'Sign up with Google',
        createAccount: 'Create Account',
        demoNotice: 'Demo register enabled. This creates a local session only.',
        alreadyHaveAccount: 'Already have an account?',
        logIn: 'Log in',
      },
    },
    settings: {
      panelTitle: 'Settings',
      language: {
        title: 'Language',
        description: 'Choose the language you prefer to use Velor.',
        defaultBadge: 'Default: Spanish',
      },
      uiSounds: {
        label: 'UI Sounds (Click + Typing)',
        description: 'Play short sounds when you click or type for interface feedback.',
      },
      musicVolume: {
        label: 'Background Music Volume',
        description: 'Control the background music volume while you work.',
      },
      taskSwitchConfirm: {
        label: 'Confirm Task Switch',
        description: 'Prevents accidental switches by asking before changing tasks while one is running.',
      },
      timeZone: {
        title: 'Time Zone',
        description: 'Sets the time shown in the clock and in new log entries.',
        autoDetectLabel: 'Auto-detect Time Zone',
        currentDescription: 'Time zone in use: {timeZone}',
        manualTitle: 'Manual Time Zone',
        optionsCount: '{count} options',
        searchPlaceholder: 'Search timezone...',
        noMatches: 'No time zones match your search.',
        disableAutoHint: 'Turn off auto-detect to choose a different time zone manually.',
        activeHint: 'Selected time zone: {timeZone}',
      },
      signOutConfirmation: {
        title: 'Sign Out Confirmation',
        description:
          'For security, signing out asks for confirmation before leaving your account.',
      },
    },
  },
} as const

export type AppLocale = keyof typeof messages

export const DEFAULT_APP_LOCALE: AppLocale = 'es'
export const APP_LOCALE_STORAGE_KEY = 'velor.settings.language'
export const SUPPORTED_APP_LOCALES = Object.keys(messages) as AppLocale[]

export function toIntlLocaleTag(locale: AppLocale) {
  return locale === 'es' ? 'es-PE' : 'en-US'
}

export function getCurrentIntlLocaleTag() {
  if (typeof document !== 'undefined' && document.documentElement.lang) {
    const lang = document.documentElement.lang.trim().toLowerCase()
    if (lang === 'es') return 'es-PE'
    if (lang === 'en') return 'en-US'
  }

  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(APP_LOCALE_STORAGE_KEY)?.trim().toLowerCase()
    if (stored === 'es') return 'es-PE'
    if (stored === 'en') return 'en-US'
  }

  return toIntlLocaleTag(DEFAULT_APP_LOCALE)
}

