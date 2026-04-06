import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'

interface UpdateInfo {
  version: string
  download_url: string
  changelog?: string
}

interface UpdateState {
  updateAvailable: UpdateInfo | null
  checking: boolean
  dismissed: boolean
  checkForUpdates: () => Promise<void>
  dismiss: () => void
}

export const useUpdateStore = create<UpdateState>((set) => ({
  updateAvailable: null,
  checking: false,
  dismissed: false,

  checkForUpdates: async () => {
    set({ checking: true })
    try {
      const info = await invoke<UpdateInfo | null>('check_for_updates')
      set({ updateAvailable: info, checking: false })
    } catch (e) {
      console.warn('[Update] Check failed:', e)
      set({ checking: false })
    }
  },

  dismiss: () => set({ dismissed: true }),
}))
