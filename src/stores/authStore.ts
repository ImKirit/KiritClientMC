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

export interface MsTokenResponse {
  access_token: string
  refresh_token: string | null
  token_type: string
  expires_in: number
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
  authStage: string | null
  loginFlow: {
    userCode: string
    verificationUri: string
    deviceCode: string
  } | null

  loadAccounts: () => Promise<void>
  startLogin: () => Promise<void>
  pollLogin: () => Promise<MsTokenResponse | null>
  completeLogin: (msToken: MsTokenResponse) => Promise<AuthResult>
  removeAccount: (uuid: string) => Promise<void>
  setActiveAccount: (uuid: string) => Promise<void>
  cancelLogin: () => void
  getActiveAccount: () => Account | undefined
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  accounts: [],
  isLoading: false,
  authStage: null,
  loginFlow: null,

  loadAccounts: async () => {
    const accounts = await invoke<Account[]>('get_accounts')
    set({ accounts })
  },

  startLogin: async () => {
    set({ isLoading: true, authStage: null })
    try {
      const resp = await invoke<DeviceCodeResponse>('ms_auth_start')
      set({
        loginFlow: {
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

  // Only polls for MS token — returns quickly
  pollLogin: async () => {
    const flow = get().loginFlow
    if (!flow) return null
    const result = await invoke<MsTokenResponse | null>('ms_auth_poll', {
      deviceCode: flow.deviceCode,
    })
    return result
  },

  // Separate step: complete the auth chain (Xbox → XSTS → MC → Profile)
  completeLogin: async (msToken: MsTokenResponse) => {
    set({ authStage: 'Authenticating with Xbox Live...' })
    try {
      const result = await invoke<AuthResult>('ms_auth_complete', {
        accessToken: msToken.access_token,
        refreshToken: msToken.refresh_token || '',
      })
      set({ loginFlow: null, authStage: null })
      await get().loadAccounts()
      return result
    } catch (e) {
      set({ loginFlow: null, authStage: null })
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
    set({ loginFlow: null, authStage: null })
  },

  getActiveAccount: () => {
    return get().accounts.find(a => a.is_active)
  },
}))
