import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export type Locale = 'en' | 'de'

const translations: Record<Locale, Record<string, string>> = {
  en: {
    // Nav / Sidebar
    'nav.home': 'Home',
    'nav.accounts': 'Accounts',
    'nav.instances': 'Instances',
    'nav.skins': 'Skins',
    'nav.servers': 'Servers',
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
    'instances.settings': 'Settings',
    'instances.instanceName': 'Instance Name',
    'instances.javaVersion': 'Java Version',
    'instances.autoDetectJava': 'Auto-detect',
    'instances.saveSettings': 'Save Changes',
    'instances.settingsSaved': 'Settings saved',
    'instances.modInfo': 'Mod Info',
    'instances.modVersion': 'Version',
    'instances.modDescription': 'Description',
    'instances.modDependencies': 'Dependencies',
    'instances.noDependencies': 'No dependencies',
    'instances.updateAvailable': 'Update available',
    'instances.updateAll': 'Update All',
    'instances.update': 'Update',
    'instances.upToDate': 'Up to date',
    'instances.installStandards': 'Install Standards',
    'instances.installingStandards': 'Installing... ({current}/{total})',
    'instances.standardsInstalled': 'Standards installed!',
    'instances.standardsNone': 'No standards configured for {type}',

    // Settings - Standards
    'settings.standards': 'Standard Packages',
    'settings.standardsDesc': 'Configure which mods, texture packs, and shaders are installed with "Install Standards".',
    'settings.standardMods': 'Standard Mods',
    'settings.standardTexturePacks': 'Standard Texture Packs',
    'settings.standardShaders': 'Standard Shaders',
    'settings.addStandard': 'Add',
    'settings.standardTitle': 'Package name',

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
    'settings.glowEnabled': 'Cursor glow',
    'settings.glowSize': 'Glow size',

    // Accounts (extra)
    'accounts.addAccount': 'Add Account',
    'accounts.msLogin': 'Microsoft Login',
    'accounts.msLoginDesc': 'Go to the link below and enter this code:',
    'accounts.openLink': 'Open {uri}',
    'accounts.waiting': 'Waiting for authorization...',
    'accounts.noAccounts': 'No accounts added yet',
    'accounts.noAccountsHint': 'Click "Add Account" to login with Microsoft',

    // Home (extra)
    'home.running': 'RUNNING',
    'home.loading': 'LOADING...',
    'home.loginHint': 'Log in with a Microsoft account to play',
    'home.dismiss': 'Dismiss',

    // Cosmetics
    'cosmetics.yourCape': 'Your Cape',
    'cosmetics.capeDrop': 'Drop a 64x32 PNG here or click to upload',
    'cosmetics.capeVisible': 'Your cape will be visible to all KiritClient users',
    'cosmetics.capePreview': 'Cape Preview',
    'cosmetics.noCape': 'No cape',
    'cosmetics.creatorCode': 'Creator Code',
    'cosmetics.creatorDesc': 'Enter a creator code to support your favorite content creator.',
    'cosmetics.enterCode': 'Enter code...',
    'cosmetics.apply': 'Apply',
    'cosmetics.creatorNote': 'Only selected creators can generate codes.',

    // Skins (extra)
    'skins.dropSkin': 'Drop a 64x64 skin PNG or click to upload',
    'skins.dropSkinHint': 'Supports classic (4px arms) and slim (3px arms)',
    'skins.noSkins': 'No skins uploaded yet',
    'skins.equipped': 'Equipped',
    'skins.currentSkin': 'Current skin',
    'skins.slimAlex': 'Slim (Alex)',
    'skins.classicSteve': 'Classic (Steve)',

    // Common
    'common.search': 'Search',
    'common.searching': 'Searching...',
    'common.noResults': 'No results found',
    'common.mods': 'Mods',
    'common.texturePacks': 'Texture Packs',
    'common.shaders': 'Shaders',
    'common.cancel': 'Cancel',
    'common.login': 'Login',
  },
  de: {
    // Nav / Sidebar
    'nav.home': 'Start',
    'nav.accounts': 'Konten',
    'nav.instances': 'Instanzen',
    'nav.skins': 'Skins',
    'nav.servers': 'Server',
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
    'instances.settings': 'Einstellungen',
    'instances.instanceName': 'Instanz-Name',
    'instances.javaVersion': 'Java Version',
    'instances.autoDetectJava': 'Automatisch erkennen',
    'instances.saveSettings': 'Änderungen speichern',
    'instances.settingsSaved': 'Einstellungen gespeichert',
    'instances.modInfo': 'Mod Info',
    'instances.modVersion': 'Version',
    'instances.modDescription': 'Beschreibung',
    'instances.modDependencies': 'Abhängigkeiten',
    'instances.noDependencies': 'Keine Abhängigkeiten',
    'instances.updateAvailable': 'Update verfügbar',
    'instances.updateAll': 'Alle aktualisieren',
    'instances.update': 'Aktualisieren',
    'instances.upToDate': 'Aktuell',
    'instances.installStandards': 'Standards installieren',
    'instances.installingStandards': 'Installiere... ({current}/{total})',
    'instances.standardsInstalled': 'Standards installiert!',
    'instances.standardsNone': 'Keine Standards konfiguriert für {type}',

    // Settings - Standards
    'settings.standards': 'Standard-Pakete',
    'settings.standardsDesc': 'Konfiguriere welche Mods, Texturenpakete und Shader mit "Standards installieren" installiert werden.',
    'settings.standardMods': 'Standard-Mods',
    'settings.standardTexturePacks': 'Standard-Texturenpakete',
    'settings.standardShaders': 'Standard-Shader',
    'settings.addStandard': 'Hinzufügen',
    'settings.standardTitle': 'Paketname',

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
    'settings.glowEnabled': 'Cursor-Glow',
    'settings.glowSize': 'Glow-Größe',

    // Accounts (extra)
    'accounts.addAccount': 'Konto hinzufügen',
    'accounts.msLogin': 'Microsoft Login',
    'accounts.msLoginDesc': 'Gehe zum Link und gib diesen Code ein:',
    'accounts.openLink': '{uri} öffnen',
    'accounts.waiting': 'Warte auf Autorisierung...',
    'accounts.noAccounts': 'Noch keine Konten hinzugefügt',
    'accounts.noAccountsHint': 'Klicke auf "Konto hinzufügen" um dich mit Microsoft anzumelden',

    // Home (extra)
    'home.running': 'LÄUFT',
    'home.loading': 'LADEN...',
    'home.loginHint': 'Melde dich mit einem Microsoft-Konto an um zu spielen',
    'home.dismiss': 'Schließen',

    // Cosmetics
    'cosmetics.yourCape': 'Dein Cape',
    'cosmetics.capeDrop': 'Ziehe eine 64x32 PNG hierher oder klicke zum Hochladen',
    'cosmetics.capeVisible': 'Dein Cape ist für alle KiritClient-Nutzer sichtbar',
    'cosmetics.capePreview': 'Cape Vorschau',
    'cosmetics.noCape': 'Kein Cape',
    'cosmetics.creatorCode': 'Creator Code',
    'cosmetics.creatorDesc': 'Gib einen Creator Code ein, um deinen Lieblings-Creator zu unterstützen.',
    'cosmetics.enterCode': 'Code eingeben...',
    'cosmetics.apply': 'Anwenden',
    'cosmetics.creatorNote': 'Nur ausgewählte Creator können Codes erstellen.',

    // Skins (extra)
    'skins.dropSkin': 'Ziehe eine 64x64 Skin-PNG hierher oder klicke zum Hochladen',
    'skins.dropSkinHint': 'Unterstützt Classic (4px Arme) und Slim (3px Arme)',
    'skins.noSkins': 'Noch keine Skins hochgeladen',
    'skins.equipped': 'Angelegt',
    'skins.currentSkin': 'Aktueller Skin',
    'skins.slimAlex': 'Slim (Alex)',
    'skins.classicSteve': 'Classic (Steve)',

    // Common
    'common.search': 'Suchen',
    'common.searching': 'Suche...',
    'common.noResults': 'Keine Ergebnisse gefunden',
    'common.mods': 'Mods',
    'common.texturePacks': 'Texturenpakete',
    'common.shaders': 'Shader',
    'common.cancel': 'Abbrechen',
    'common.login': 'Anmelden',
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
