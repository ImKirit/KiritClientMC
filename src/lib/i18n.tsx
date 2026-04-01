import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export type Locale = 'en' | 'de'

const translations: Record<Locale, Record<string, string>> = {
  en: {
    // Nav / Sidebar
    'nav.home': 'Home',
    'nav.accounts': 'Accounts',
    'nav.instances': 'Instances',
    'nav.skins': 'Skins',
    'nav.cosmetics': 'Cosmetics',
    'nav.settings': 'Settings',

    // Home
    'home.play': 'PLAY',
    'home.launching': 'LAUNCHING...',
    'home.selectInstance': 'Select an instance to play',
    'home.noAccount': 'Login to play',

    // Accounts
    'accounts.title': 'Accounts',
    'accounts.login': 'Login with Microsoft',
    'accounts.active': 'Active',
    'accounts.online': 'Online',
    'accounts.offline': 'Offline',
    'accounts.notLoggedIn': 'Not logged in',
    'accounts.remove': 'Remove',
    'accounts.setActive': 'Set Active',

    // Instances
    'instances.title': 'Instances',
    'instances.new': 'New Instance',
    'instances.edit': 'Edit Instance',
    'instances.name': 'Name',
    'instances.namePlaceholder': 'Instance name',
    'instances.icon': 'Icon',
    'instances.version': 'Minecraft Version',
    'instances.loader': 'Mod Loader',
    'instances.fabricVersion': 'Fabric Version',
    'instances.latestStable': 'Latest Stable',
    'instances.memory': 'Memory',
    'instances.save': 'Save',
    'instances.create': 'Create',
    'instances.cancel': 'Cancel',
    'instances.backToInstances': 'Back to Instances',
    'instances.noMods': 'No {type} installed',
    'instances.addHint': 'Click "Add {type}" to search Modrinth',
    'instances.add': 'Add {type}',
    'instances.enabled': 'Enabled',
    'instances.disabled': 'Disabled',

    // Skins
    'skins.title': 'Skins',
    'skins.upload': 'Upload Skin',
    'skins.dropHint': 'Drop a .png skin file here or click to upload',
    'skins.preview': 'Preview',
    'skins.loginToSee': 'Login to see your skin',
    'skins.equip': 'Equip',
    'skins.remove': 'Remove',
    'skins.slim': 'Slim',
    'skins.classic': 'Classic',

    // Cosmetics
    'cosmetics.title': 'Cosmetics',
    'cosmetics.comingSoon': 'Coming Soon',
    'cosmetics.desc': 'Custom capes, name effects, and more — purchasable with credits.',

    // Settings
    'settings.title': 'Settings',
    'settings.general': 'General',
    'settings.language': 'Language',
    'settings.java': 'Java',
    'settings.javaPath': 'Java Path',
    'settings.autoDetect': 'Auto-detect',
    'settings.defaultMemory': 'Default Memory',
    'settings.appearance': 'Appearance',
    'settings.theme': 'Theme',
    'settings.dark': 'Dark',
    'settings.about': 'About',
    'settings.version': 'Version',
    'settings.checkUpdates': 'Check for Updates',

    // Common
    'common.search': 'Search',
    'common.searching': 'Searching...',
    'common.noResults': 'No results found',
    'common.mods': 'Mods',
    'common.texturePacks': 'Texture Packs',
    'common.shaders': 'Shaders',
  },
  de: {
    // Nav / Sidebar
    'nav.home': 'Start',
    'nav.accounts': 'Konten',
    'nav.instances': 'Instanzen',
    'nav.skins': 'Skins',
    'nav.cosmetics': 'Kosmetik',
    'nav.settings': 'Einstellungen',

    // Home
    'home.play': 'SPIELEN',
    'home.launching': 'STARTET...',
    'home.selectInstance': 'Wähle eine Instanz zum Spielen',
    'home.noAccount': 'Einloggen zum Spielen',

    // Accounts
    'accounts.title': 'Konten',
    'accounts.login': 'Mit Microsoft anmelden',
    'accounts.active': 'Aktiv',
    'accounts.online': 'Online',
    'accounts.offline': 'Offline',
    'accounts.notLoggedIn': 'Nicht eingeloggt',
    'accounts.remove': 'Entfernen',
    'accounts.setActive': 'Aktivieren',

    // Instances
    'instances.title': 'Instanzen',
    'instances.new': 'Neue Instanz',
    'instances.edit': 'Instanz bearbeiten',
    'instances.name': 'Name',
    'instances.namePlaceholder': 'Instanz-Name',
    'instances.icon': 'Symbol',
    'instances.version': 'Minecraft Version',
    'instances.loader': 'Mod Loader',
    'instances.fabricVersion': 'Fabric Version',
    'instances.latestStable': 'Neueste stabile',
    'instances.memory': 'Arbeitsspeicher',
    'instances.save': 'Speichern',
    'instances.create': 'Erstellen',
    'instances.cancel': 'Abbrechen',
    'instances.backToInstances': 'Zurück zu Instanzen',
    'instances.noMods': 'Keine {type} installiert',
    'instances.addHint': 'Klicke auf "{type} hinzufügen" um auf Modrinth zu suchen',
    'instances.add': '{type} hinzufügen',
    'instances.enabled': 'Aktiviert',
    'instances.disabled': 'Deaktiviert',

    // Skins
    'skins.title': 'Skins',
    'skins.upload': 'Skin hochladen',
    'skins.dropHint': 'Ziehe eine .png Skin-Datei hierher oder klicke zum Hochladen',
    'skins.preview': 'Vorschau',
    'skins.loginToSee': 'Einloggen um deinen Skin zu sehen',
    'skins.equip': 'Anlegen',
    'skins.remove': 'Entfernen',
    'skins.slim': 'Slim',
    'skins.classic': 'Klassisch',

    // Cosmetics
    'cosmetics.title': 'Kosmetik',
    'cosmetics.comingSoon': 'Demnächst verfügbar',
    'cosmetics.desc': 'Capes, Namens-Effekte und mehr — kaufbar mit Credits.',

    // Settings
    'settings.title': 'Einstellungen',
    'settings.general': 'Allgemein',
    'settings.language': 'Sprache',
    'settings.java': 'Java',
    'settings.javaPath': 'Java Pfad',
    'settings.autoDetect': 'Automatisch erkennen',
    'settings.defaultMemory': 'Standard-Arbeitsspeicher',
    'settings.appearance': 'Darstellung',
    'settings.theme': 'Thema',
    'settings.dark': 'Dunkel',
    'settings.about': 'Über',
    'settings.version': 'Version',
    'settings.checkUpdates': 'Nach Updates suchen',

    // Common
    'common.search': 'Suchen',
    'common.searching': 'Suche...',
    'common.noResults': 'Keine Ergebnisse gefunden',
    'common.mods': 'Mods',
    'common.texturePacks': 'Texturenpakete',
    'common.shaders': 'Shader',
  },
}

interface I18nContext {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: Record<string, string>) => string
}

const I18nCtx = createContext<I18nContext>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key,
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem('kirit-locale')
    if (saved === 'de' || saved === 'en') return saved
    return navigator.language.startsWith('de') ? 'de' : 'en'
  })

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    localStorage.setItem('kirit-locale', l)
  }, [])

  const t = useCallback((key: string, params?: Record<string, string>) => {
    let str = translations[locale][key] || translations['en'][key] || key
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(`{${k}}`, v)
      }
    }
    return str
  }, [locale])

  return (
    <I18nCtx.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nCtx.Provider>
  )
}

export function useI18n() {
  return useContext(I18nCtx)
}
