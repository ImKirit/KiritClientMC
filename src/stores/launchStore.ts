import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

interface LaunchProgress {
  stage: string
  message: string
  progress: number
  pid?: number
}

interface LaunchStore {
  isLaunching: boolean
  progress: LaunchProgress | null
  error: string | null

  launchGame: (profileId: string) => Promise<void>
  reset: () => void
  setupListeners: () => Promise<() => void>
}

export const useLaunchStore = create<LaunchStore>((set) => ({
  isLaunching: false,
  progress: null,
  error: null,

  launchGame: async (profileId: string) => {
    console.log('[Launch] Starting launch for profile:', profileId)
    set({ isLaunching: true, progress: null, error: null })
    try {
      await invoke('launch_game', { profileId })
      console.log('[Launch] invoke returned successfully')
    } catch (e: any) {
      console.error('[Launch] Error:', e)
      set({ error: String(e), isLaunching: false })
    }
  },

  reset: () => {
    set({ isLaunching: false, progress: null, error: null })
  },

  setupListeners: async () => {
    const unlisten1 = await listen<LaunchProgress>('launch:progress', (event) => {
      set({ progress: event.payload })
      if (event.payload.stage === 'running') {
        setTimeout(() => {
          set({ isLaunching: false })
        }, 2000)
      }
    })
    const unlisten2 = await listen<string>('launch:error', (event) => {
      console.error('[Launch] MC Error:', event.payload)
      set({ error: event.payload, isLaunching: false })
    })
    return () => { unlisten1(); unlisten2() }
  },
}))
