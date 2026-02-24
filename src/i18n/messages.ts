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
        description: 'Selecciona el idioma de la interfaz (preparado para expansión gradual).',
        defaultBadge: 'Predeterminado: Español',
      },
      uiSounds: {
        label: 'Sonidos UI (Click + Escritura)',
        description: 'Activa o desactiva los sonidos de clic y escritura de la interfaz.',
      },
      musicVolume: {
        label: 'Volumen de Música de Fondo',
        description: 'Ajusta el volumen de la música en bucle.',
      },
      taskSwitchConfirm: {
        label: 'Confirmar Cambio de Tarea',
        description: 'Pide confirmación antes de cambiar mientras otra tarea está en ejecución.',
      },
      timeZone: {
        title: 'Zona Horaria',
        description: 'Se usa para el reloj del encabezado y nuevos registros del historial.',
        autoDetectLabel: 'Detectar Zona Horaria Automáticamente',
        currentDescription: 'Actual: {timeZone}',
        manualTitle: 'Zona Horaria Manual',
        optionsCount: '{count} opciones',
        searchPlaceholder: 'Buscar zona horaria...',
        noMatches: 'No hay zonas horarias que coincidan con tu búsqueda.',
        disableAutoHint: 'Desactiva la detección automática para elegir una zona horaria IANA diferente.',
        activeHint: 'Activa: {timeZone}',
      },
      signOutConfirmation: {
        title: 'Confirmación de Cierre de Sesión',
        description:
          'Cerrar sesión siempre requerirá confirmación. Esta configuración solo afecta el cambio de tareas que ya están en progreso.',
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
        description: 'Select the interface language (ready for gradual rollout).',
        defaultBadge: 'Default: Spanish',
      },
      uiSounds: {
        label: 'UI Sounds (Click + Typing)',
        description: 'Enable or disable UI click and typing sounds.',
      },
      musicVolume: {
        label: 'Background Music Volume',
        description: 'Adjust the volume of the loop music.',
      },
      taskSwitchConfirm: {
        label: 'Confirm Task Switch',
        description: 'Ask for confirmation before switching while another task is currently running.',
      },
      timeZone: {
        title: 'Time Zone',
        description: 'Used for the header clock and new log timestamps.',
        autoDetectLabel: 'Auto-detect Time Zone',
        currentDescription: 'Current: {timeZone}',
        manualTitle: 'Manual Time Zone',
        optionsCount: '{count} options',
        searchPlaceholder: 'Search timezone...',
        noMatches: 'No time zones match your search.',
        disableAutoHint: 'Disable auto-detect to choose a different IANA time zone.',
        activeHint: 'Active: {timeZone}',
      },
      signOutConfirmation: {
        title: 'Sign Out Confirmation',
        description:
          'Sign out will always require confirmation. This setting only affects switching tasks that are already in progress.',
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
