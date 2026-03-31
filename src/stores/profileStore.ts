import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'

export type LoaderType = 'vanilla' | 'fabric' | 'forge' | 'neoforge' | 'quilt'

export interface Profile {
  id: string
  name: string
  icon: string
  mc_version: string
  loader_type: LoaderType
  loader_version: string | null
  java_path: string | null
  memory_mb: number
  jvm_args: string
  game_args: string
  resolution_width: number
  resolution_height: number
  game_dir: string
  last_played: string | null
  total_playtime: number
  created: string
}

export interface VersionEntry {
  id: string
  type: string
  url: string
  releaseTime: string
}

export interface FabricLoaderVersion {
  loader: {
    version: string
    stable: boolean
  }
}

interface ProfileStore {
  profiles: Profile[]
  selectedProfileId: string | null
  versions: VersionEntry[]
  fabricVersions: FabricLoaderVersion[]
  isLoading: boolean

  loadProfiles: () => Promise<void>
  createProfile: (profile: Partial<Profile>) => Promise<Profile>
  updateProfile: (profile: Profile) => Promise<void>
  deleteProfile: (id: string) => Promise<void>
  selectProfile: (id: string) => void
  getSelectedProfile: () => Profile | undefined
  fetchVersions: () => Promise<void>
  fetchFabricVersions: (mcVersion: string) => Promise<void>
}

export const useProfileStore = create<ProfileStore>((set, get) => ({
  profiles: [],
  selectedProfileId: null,
  versions: [],
  fabricVersions: [],
  isLoading: false,

  loadProfiles: async () => {
    const profiles = await invoke<Profile[]>('get_profiles')
    set({ profiles })
    if (profiles.length > 0 && !get().selectedProfileId) {
      set({ selectedProfileId: profiles[0].id })
    }
  },

  createProfile: async (profile: Partial<Profile>) => {
    const newProfile = await invoke<Profile>('create_profile', { profile })
    await get().loadProfiles()
    return newProfile
  },

  updateProfile: async (profile: Profile) => {
    await invoke('update_profile', { profile })
    await get().loadProfiles()
  },

  deleteProfile: async (id: string) => {
    await invoke('delete_profile', { id })
    const profiles = get().profiles.filter(p => p.id !== id)
    set({
      profiles,
      selectedProfileId: profiles.length > 0 ? profiles[0].id : null,
    })
  },

  selectProfile: (id: string) => {
    set({ selectedProfileId: id })
  },

  getSelectedProfile: () => {
    const { profiles, selectedProfileId } = get()
    return profiles.find(p => p.id === selectedProfileId)
  },

  fetchVersions: async () => {
    set({ isLoading: true })
    try {
      const versions = await invoke<VersionEntry[]>('fetch_versions')
      set({ versions, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  fetchFabricVersions: async (mcVersion: string) => {
    try {
      const fabricVersions = await invoke<FabricLoaderVersion[]>('fetch_fabric_versions', { mcVersion })
      set({ fabricVersions })
    } catch {
      set({ fabricVersions: [] })
    }
  },
}))
