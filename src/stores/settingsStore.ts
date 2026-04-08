import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'

export interface JavaInstallation {
  path: string
  version: string
  is_auto: boolean
}

export interface StandardPackage {
  title: string
  resource_type: string
  slug?: string
  icon_url?: string | null
}

export interface Settings {
  default_memory_mb: number
  download_threads: number
  close_on_launch: boolean
  show_console: boolean
  java_paths: JavaInstallation[]
  standard_packages: StandardPackage[]
}

interface SettingsStore {
  settings: Settings
  detectedJava: [string, string][]
  isLoading: boolean

  loadSettings: () => Promise<void>
  updateSettings: (settings: Settings) => Promise<void>
  detectJava: () => Promise<void>
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: {
    default_memory_mb: 4096,
    download_threads: 8,
    close_on_launch: false,
    show_console: false,
    java_paths: [],
    standard_packages: [],
  },
  detectedJava: [],
  isLoading: false,

  loadSettings: async () => {
    const settings = await invoke<Settings>('get_settings')
    set({ settings })
  },

  updateSettings: async (settings: Settings) => {
    await invoke('update_settings', { settings })
    set({ settings })
  },

  detectJava: async () => {
    set({ isLoading: true })
    try {
      const java = await invoke<[string, string][]>('detect_java')
      set({ detectedJava: java, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },
}))
