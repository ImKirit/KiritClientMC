import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'

export interface Account {
  uuid: string
  username: string
  skin_url: string | null
  access_token: string
  refresh_token: string
  is_active: boolean
}

export interface DeviceCodeResponse {
  user_code: string
  device_code: string
  verification_uri: string
  expires_in: number
  interval: number
}

export interface AuthResult {
  uuid: string
  username: string
  skin_url: string | null
  access_token: string
  refresh_token: string
}

interface AuthStore {
  accounts: Account[]
  isLoading: boolean
  loginFlow: {
    active: boolean
    userCode: string
    verificationUri: string
    deviceCode: string
  } | null

  loadAccounts: () => Promise<void>
  startLogin: () => Promise<void>
  pollLogin: () => Promise<AuthResult | null>
  removeAccount: (uuid: string) => Promise<void>
  setActiveAccount: (uuid: string) => Promise<void>
  cancelLogin: () => void
  getActiveAccount: () => Account | undefined
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  accounts: [],
  isLoading: false,
  loginFlow: null,

  loadAccounts: async () => {
    const accounts = await invoke<Account[]>('get_accounts')
    set({ accounts })
  },

  startLogin: async () => {
    set({ isLoading: true })
    try {
      const resp = await invoke<DeviceCodeResponse>('ms_auth_start')
      set({
        loginFlow: {
          active: true,
          userCode: resp.user_code,
          verificationUri: resp.verification_uri,
          deviceCode: resp.device_code,
        },
        isLoading: false,
      })
    } catch (e) {
      set({ isLoading: false })
      throw e
    }
  },

  pollLogin: async () => {
    const flow = get().loginFlow
    if (!flow) return null
    try {
      const result = await invoke<AuthResult | null>('ms_auth_poll', {
        deviceCode: flow.deviceCode,
      })
      if (result) {
        set({ loginFlow: null })
        await get().loadAccounts()
      }
      return result
    } catch (e) {
      set({ loginFlow: null })
      throw e
    }
  },

  removeAccount: async (uuid: string) => {
    await invoke('remove_account', { uuid })
    await get().loadAccounts()
  },

  setActiveAccount: async (uuid: string) => {
    await invoke('set_active_account', { uuid })
    await get().loadAccounts()
  },

  cancelLogin: () => {
    set({ loginFlow: null })
  },

  getActiveAccount: () => {
    return get().accounts.find(a => a.is_active)
  },
}))
