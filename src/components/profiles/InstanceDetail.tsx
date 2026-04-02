import { useState, useRef, useEffect } from 'react'
import { Search, Package, Plus, X, Download, ToggleLeft, ToggleRight, ChevronLeft, Clock, HardDrive, Gamepad2, Settings, Info, Image } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import type { Profile, LoaderType } from '../../stores/profileStore'
import { useProfileStore } from '../../stores/profileStore'
import { Modal } from '../ui/Modal'
import { useI18n } from '../../lib/i18n'

type ResourceType = 'mod' | 'resourcepack' | 'shader'
type ViewTab = ResourceType | 'settings'

interface InstalledResource {
  slug: string
  title: string
  icon_url: string | null
  resource_type: string
  enabled: boolean
  version_id: string | null
  file_name: string | null
  file_url: string | null
}

interface ModrinthProject {
  slug: string
  title: string
  description: string
  icon_url: string | null
  downloads: number
  project_type: string
}

const tabKeys: { type: ResourceType; labelKey: string; modrinthType: string }[] = [
  { type: 'mod', labelKey: 'common.mods', modrinthType: 'mod' },
  { type: 'resourcepack', labelKey: 'common.texturePacks', modrinthType: 'resourcepack' },
  { type: 'shader', labelKey: 'common.shaders', modrinthType: 'shader' },
]

interface ModrinthVersionInfo {
  id: string
  version_number: string
  files: { filename: string; url: string; primary: boolean }[]
  dependencies: { project_id: string; dependency_type: string }[]
}

interface InstanceDetailProps {
  profile: Profile
  onBack: () => void
}

export function InstanceDetail({ profile: initialProfile, onBack }: InstanceDetailProps) {
  const { t } = useI18n()
  const { versions, fabricVersions, updateProfile, fetchVersions, fetchFabricVersions } = useProfileStore()
  const [profile, setProfile] = useState(initialProfile)
  const [activeTab, setActiveTab] = useState<ViewTab>('mod')
  const [installed, setInstalled] = useState<InstalledResource[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ModrinthProject[]>([])
  const [searching, setSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [selectedMod, setSelectedMod] = useState<InstalledResource | null>(null)
  const [modDescription, setModDescription] = useState<string>('')
  const [modDependencies, setModDependencies] = useState<string[]>([])
  const [modLatestVersion, setModLatestVersion] = useState<string>('')
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [editProfile, setEditProfile] = useState(initialProfile)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load persisted resources + versions on mount
  useEffect(() => {
    invoke<InstalledResource[]>('get_instance_resources', { profileId: profile.id })
      .then(setInstalled)
      .catch(() => {})
    fetchVersions()
    if (profile.loader_type === 'fabric') {
      fetchFabricVersions(profile.mc_version)
    }
  }, [profile.id])

  // Persist resources whenever they change
  const persistResources = (resources: InstalledResource[]) => {
    setInstalled(resources)
    invoke('save_instance_resources', { profileId: profile.id, resources }).catch(() => {})
  }

  const search = async (q: string, type: ResourceType) => {
    if (!q.trim()) {
      setResults([])
      return
    }
    setSearching(true)
    try {
      const tab = tabKeys.find(t => t.type === type)!
      const facets: string[][] = [
        [`versions:${profile.mc_version}`],
        [`project_type:${tab.modrinthType}`],
      ]
      if (type === 'mod' && profile.loader_type !== 'vanilla') {
        facets.push([`categories:${profile.loader_type}`])
      }
      const params = new URLSearchParams({
        query: q,
        limit: '20',
        facets: JSON.stringify(facets),
      })
      const res = await fetch(`https://api.modrinth.com/v2/search?${params}`)
      const data = await res.json()
      setResults(data.hits || [])
    } catch {
      setResults([])
    }
    setSearching(false)
  }

  const handleInput = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (activeTab !== 'settings') {
      debounceRef.current = setTimeout(() => search(value, activeTab), 400)
    }
  }

  const switchTab = (type: ViewTab) => {
    setActiveTab(type)
    setQuery('')
    setResults([])
    setShowSearch(false)
    setSelectedMod(null)
    if (type === 'settings') {
      setEditProfile({ ...profile })
    }
  }

  // Settings save
  const handleSaveSettings = async () => {
    await updateProfile(editProfile)
    setProfile(editProfile)
    setSettingsSaved(true)
    setTimeout(() => setSettingsSaved(false), 2000)
  }

  const handleSettingsLoaderChange = (type: LoaderType) => {
    setEditProfile({ ...editProfile, loader_type: type, loader_version: null })
    if (type === 'fabric') {
      fetchFabricVersions(editProfile.mc_version)
    }
  }

  const handleSettingsVersionChange = (version: string) => {
    setEditProfile({ ...editProfile, mc_version: version, loader_version: null })
    if (editProfile.loader_type === 'fabric') {
      fetchFabricVersions(version)
    }
  }

  // Mod info
  const openModInfo = async (resource: InstalledResource) => {
    setSelectedMod(resource)
    setModDescription('')
    setModDependencies([])
    setModLatestVersion('')
    try {
      const res = await fetch(`https://api.modrinth.com/v2/project/${resource.slug}`, {
        headers: { 'User-Agent': 'KiritClient/0.1.0' }
      })
      const data = await res.json()
      setModDescription(data.description || '')

      // Get latest version for this MC version
      const vRes = await fetch(
        `https://api.modrinth.com/v2/project/${resource.slug}/version?game_versions=["${profile.mc_version}"]&loaders=["${profile.loader_type}"]`,
        { headers: { 'User-Agent': 'KiritClient/0.1.0' } }
      )
      const versions: ModrinthVersionInfo[] = await vRes.json()
      if (versions.length > 0) {
        setModLatestVersion(versions[0].version_number)
        const deps = versions[0].dependencies?.filter(d => d.dependency_type === 'required') || []
        if (deps.length > 0) {
          const depSlugs = await Promise.all(deps.map(async (d) => {
            try {
              const r = await fetch(`https://api.modrinth.com/v2/project/${d.project_id}`, {
                headers: { 'User-Agent': 'KiritClient/0.1.0' }
              })
              const p = await r.json()
              return p.title || d.project_id
            } catch { return d.project_id }
          }))
          setModDependencies(depSlugs)
        }
      }
    } catch { /* ignore */ }
  }

  const addResource = async (project: ModrinthProject) => {
    if (installed.some(r => r.slug === project.slug)) return

    // Resolve Modrinth version to get download URL
    let versionId: string | null = null
    let fileName: string | null = null
    let fileUrl: string | null = null

    try {
      const version = await invoke<any>('resolve_modrinth_version', {
        slug: project.slug,
        mcVersion: profile.mc_version,
        loaderType: profile.loader_type,
      })
      if (version && version.files && version.files.length > 0) {
        const primary = version.files.find((f: any) => f.primary) || version.files[0]
        versionId = version.id
        fileName = primary.filename
        fileUrl = primary.url
      }
    } catch { /* continue without version info, will resolve on launch */ }

    const updated = [...installed, {
      slug: project.slug,
      title: project.title,
      icon_url: project.icon_url,
      resource_type: activeTab,
      enabled: true,
      version_id: versionId,
      file_name: fileName,
      file_url: fileUrl,
    }]
    persistResources(updated)
  }

  const removeResource = (slug: string) => {
    persistResources(installed.filter(r => r.slug !== slug))
  }

  const toggleResource = (slug: string) => {
    persistResources(installed.map(r =>
      r.slug === slug ? { ...r, enabled: !r.enabled } : r
    ))
  }

  const filteredInstalled = installed.filter(r => r.resource_type === activeTab)
  const isAdded = (slug: string) => installed.some(r => r.slug === slug)

  const formatDownloads = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return String(n)
  }

  const formatPlaytime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }

  return (
    <div className="fade-in">
      {/* Back button + Header */}
      <button
        className="flex items-center gap-2 text-[13px] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors mb-5"
        onClick={onBack}
      >
        <ChevronLeft size={16} />
        {t('instances.backToInstances')}
      </button>

      {/* Instance Info Card */}
      <div className="glass p-6 mb-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-3xl shrink-0">
            {profile.icon?.startsWith('data:') || profile.icon?.startsWith('http') ? (
              <img src={profile.icon} alt="" className="w-full h-full rounded-xl object-cover" />
            ) : (
              profile.icon === 'sword' ? '\u2694\uFE0F' :
              profile.icon === 'pickaxe' ? '\u26CF\uFE0F' :
              profile.icon === 'shield' ? '\uD83D\uDEE1\uFE0F' : '\uD83C\uDFAE'
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">{profile.name}</h2>
            <p className="text-[13px] text-[var(--text-2)] mt-0.5">
              {profile.mc_version}
              {profile.loader_type !== 'vanilla' && ` \u2022 ${profile.loader_type.charAt(0).toUpperCase() + profile.loader_type.slice(1)}`}
              {profile.loader_version && ` ${profile.loader_version}`}
            </p>
          </div>
          <div className="flex gap-6 text-[12px] text-[var(--text-3)]">
            <div className="flex items-center gap-2">
              <HardDrive size={14} />
              <span>{profile.memory_mb}MB</span>
            </div>
            {profile.total_playtime > 0 && (
              <div className="flex items-center gap-2">
                <Clock size={14} />
                <span>{formatPlaytime(profile.total_playtime)}</span>
              </div>
            )}
            {profile.last_played && (
              <div className="flex items-center gap-2">
                <Gamepad2 size={14} />
                <span>{new Date(profile.last_played).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4">
        {tabKeys.map(tab => (
          <button
            key={tab.type}
            className={`glass-btn text-[13px] px-4 py-2.5 ${activeTab === tab.type ? 'glass-btn-primary' : ''}`}
            onClick={() => switchTab(tab.type)}
          >
            {t(tab.labelKey)}
            {installed.filter(r => r.resource_type === tab.type).length > 0 && (
              <span className="ml-1.5 text-[11px] opacity-60">
                ({installed.filter(r => r.resource_type === tab.type).length})
              </span>
            )}
          </button>
        ))}
        <button
          className={`glass-btn text-[13px] px-4 py-2.5 ${activeTab === 'settings' ? 'glass-btn-primary' : ''}`}
          onClick={() => switchTab('settings')}
        >
          <Settings size={14} />
          {t('instances.settings')}
        </button>
        <div className="flex-1" />
        {activeTab !== 'settings' && (
          <button
            className="glass-btn glass-btn-primary text-[13px] px-4 py-2.5"
            onClick={() => setShowSearch(!showSearch)}
          >
            <Plus size={14} />
            {t('instances.add', { type: t(tabKeys.find(tk => tk.type === activeTab)!.labelKey) })}
          </button>
        )}
      </div>

      {/* Settings Tab Content */}
      {activeTab === 'settings' && (
        <div className="glass p-6">
          <div className="flex flex-col gap-5">
            {/* Instance Name */}
            <div>
              <label className="text-[13px] text-[var(--text-2)] mb-2 block">{t('instances.instanceName')}</label>
              <input
                className="glass-input"
                value={editProfile.name}
                onChange={e => setEditProfile({ ...editProfile, name: e.target.value })}
              />
            </div>

            {/* Icon */}
            <div>
              <label className="text-[13px] text-[var(--text-2)] mb-2 block">{t('instances.icon')}</label>
              <div className="flex gap-3 items-center">
                {['sword', 'pickaxe', 'shield', 'game'].map(icon => (
                  <button
                    key={icon}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all ${
                      editProfile.icon === icon
                        ? 'bg-white/[0.1] border border-white/[0.15]'
                        : 'bg-white/[0.03] border border-transparent hover:bg-white/[0.06]'
                    }`}
                    onClick={() => setEditProfile({ ...editProfile, icon })}
                  >
                    {icon === 'sword' ? '\u2694\uFE0F' : icon === 'pickaxe' ? '\u26CF\uFE0F' : icon === 'shield' ? '\uD83D\uDEE1\uFE0F' : '\uD83C\uDFAE'}
                  </button>
                ))}
                <button
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                    editProfile.icon?.startsWith('data:') || editProfile.icon?.startsWith('http')
                      ? 'bg-white/[0.1] border border-white/[0.15]'
                      : 'bg-white/[0.03] border border-transparent hover:bg-white/[0.06]'
                  }`}
                  onClick={() => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = 'image/*'
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0]
                      if (!file) return
                      const reader = new FileReader()
                      reader.onload = (ev) => setEditProfile({ ...editProfile, icon: ev.target?.result as string })
                      reader.readAsDataURL(file)
                    }
                    input.click()
                  }}
                >
                  {editProfile.icon?.startsWith('data:') || editProfile.icon?.startsWith('http') ? (
                    <img src={editProfile.icon} alt="" className="w-full h-full rounded-xl object-cover" />
                  ) : (
                    <Image size={18} className="text-[var(--text-3)]" />
                  )}
                </button>
              </div>
            </div>

            {/* MC Version */}
            <div>
              <label className="text-[13px] text-[var(--text-2)] mb-2 block">{t('instances.version')}</label>
              <select
                className="glass-select"
                value={editProfile.mc_version}
                onChange={e => handleSettingsVersionChange(e.target.value)}
              >
                {versions.filter(v => v.type === 'release').map(v => (
                  <option key={v.id} value={v.id}>{v.id}</option>
                ))}
              </select>
            </div>

            {/* Mod Loader */}
            <div>
              <label className="text-[13px] text-[var(--text-2)] mb-2 block">{t('instances.loader')}</label>
              <div className="flex gap-2.5 flex-wrap">
                {(['vanilla', 'fabric', 'forge', 'neoforge', 'quilt'] as LoaderType[]).map(type => (
                  <button
                    key={type}
                    className={`glass-btn text-[13px] px-4 py-2.5 ${
                      editProfile.loader_type === type ? 'glass-btn-primary' : ''
                    }`}
                    onClick={() => handleSettingsLoaderChange(type)}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Fabric Version */}
            {editProfile.loader_type === 'fabric' && fabricVersions.length > 0 && (
              <div>
                <label className="text-[13px] text-[var(--text-2)] mb-2 block">{t('instances.fabricVersion')}</label>
                <select
                  className="glass-select"
                  value={editProfile.loader_version || ''}
                  onChange={e => setEditProfile({ ...editProfile, loader_version: e.target.value || null })}
                >
                  <option value="">{t('instances.latestStable')}</option>
                  {fabricVersions.map(v => (
                    <option key={v.loader.version} value={v.loader.version}>
                      {v.loader.version} {v.loader.stable ? '(stable)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Memory */}
            <div>
              <label className="text-[13px] text-[var(--text-2)] mb-2 block">
                {t('instances.memory')}: {editProfile.memory_mb}MB
              </label>
              <input
                type="range"
                min="1024"
                max="16384"
                step="512"
                value={editProfile.memory_mb}
                onChange={e => setEditProfile({ ...editProfile, memory_mb: parseInt(e.target.value) })}
                className="w-full accent-white"
              />
              <div className="flex justify-between text-[11px] text-[var(--text-3)] mt-1">
                <span>1GB</span>
                <span>16GB</span>
              </div>
            </div>

            {/* Java Path */}
            <div>
              <label className="text-[13px] text-[var(--text-2)] mb-2 block">{t('instances.javaVersion')}</label>
              <input
                className="glass-input"
                value={editProfile.java_path || ''}
                onChange={e => setEditProfile({ ...editProfile, java_path: e.target.value || null })}
                placeholder={t('instances.autoDetectJava')}
              />
            </div>

            {/* Save Button */}
            <button
              className="glass-btn glass-btn-primary w-full"
              onClick={handleSaveSettings}
            >
              {settingsSaved ? t('instances.settingsSaved') : t('instances.saveSettings')}
            </button>
          </div>
        </div>
      )}

      {/* Resource tabs content */}
      {activeTab !== 'settings' && (
        <>
          {/* Modrinth Search Panel */}
          {showSearch && (
            <div className="glass p-5 mb-4">
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
                <input
                  className="glass-input pl-9"
                  placeholder={`${t('common.search')} ${t(tabKeys.find(tk => tk.type === activeTab)!.labelKey)}...`}
                  value={query}
                  onChange={e => handleInput(e.target.value)}
                  autoFocus
                />
              </div>

              {searching && (
                <p className="text-[12px] text-[var(--text-3)] mb-2">{t('common.searching')}</p>
              )}

              {results.length > 0 && (
                <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
                  {results.map(project => (
                    <div
                      key={project.slug}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-transparent hover:bg-white/[0.05] hover:border-white/[0.06] transition-all"
                    >
                      {project.icon_url ? (
                        <img src={project.icon_url} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0">
                          <Package size={16} className="text-[var(--text-3)]" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate">{project.title}</p>
                        <p className="text-[11px] text-[var(--text-3)] truncate">{project.description}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[11px] text-[var(--text-3)] flex items-center gap-1">
                          <Download size={10} />
                          {formatDownloads(project.downloads)}
                        </span>
                        {isAdded(project.slug) ? (
                          <button
                            className="p-2 rounded-lg bg-white/[0.08] text-[var(--text-3)]"
                            onClick={() => removeResource(project.slug)}
                          >
                            <X size={14} />
                          </button>
                        ) : (
                          <button
                            className="p-2 rounded-lg hover:bg-white/[0.1] text-[var(--text-2)] transition-colors"
                            onClick={() => addResource(project)}
                          >
                            <Plus size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!searching && query && results.length === 0 && (
                <p className="text-[12px] text-[var(--text-3)]">{t('common.noResults')}</p>
              )}
            </div>
          )}

          {/* Installed Resources List */}
          {filteredInstalled.length > 0 ? (
            <div className="flex flex-col gap-2">
              {filteredInstalled.map(resource => (
                <div
                  key={resource.slug}
                  className={`glass p-4 flex items-center gap-4 cursor-pointer hover:border-white/[0.12] transition-all ${!resource.enabled ? 'opacity-50' : ''}`}
                  onClick={() => openModInfo(resource)}
                >
                  {resource.icon_url ? (
                    <img src={resource.icon_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0">
                      <Package size={16} className="text-[var(--text-3)]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium truncate">{resource.title}</p>
                    <p className="text-[11px] text-[var(--text-3)]">
                      {resource.enabled ? t('instances.enabled') : t('instances.disabled')}
                      {resource.version_id && <span className="ml-2 opacity-60">{resource.version_id.slice(0, 8)}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      className="p-2 rounded-lg hover:bg-white/[0.08] transition-colors text-[var(--text-2)]"
                      onClick={(e) => { e.stopPropagation(); openModInfo(resource) }}
                      title="Info"
                    >
                      <Info size={16} />
                    </button>
                    <button
                      className="p-2 rounded-lg hover:bg-white/[0.08] transition-colors text-[var(--text-2)]"
                      onClick={(e) => { e.stopPropagation(); toggleResource(resource.slug) }}
                      title={resource.enabled ? 'Disable' : 'Enable'}
                    >
                      {resource.enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    </button>
                    <button
                      className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-red-400/60"
                      onClick={(e) => { e.stopPropagation(); removeResource(resource.slug) }}
                      title="Remove"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass p-8 text-center">
              <Package size={32} className="mx-auto mb-3 text-[var(--text-3)]" />
              <p className="text-[14px] text-[var(--text-2)]">
                {t('instances.noMods', { type: t(tabKeys.find(tk => tk.type === activeTab)!.labelKey) })}
              </p>
              <p className="text-[12px] text-[var(--text-3)] mt-1">
                {t('instances.addHint', { type: t(tabKeys.find(tk => tk.type === activeTab)!.labelKey) })}
              </p>
            </div>
          )}
        </>
      )}

      {/* Mod Info Panel */}
      {selectedMod && (
        <Modal onClose={() => setSelectedMod(null)}>
          <div className="flex items-center gap-4 mb-5">
            {selectedMod.icon_url ? (
              <img src={selectedMod.icon_url} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
                <Package size={24} className="text-[var(--text-3)]" />
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-lg font-semibold">{selectedMod.title}</h2>
              <p className="text-[12px] text-[var(--text-3)] mt-0.5">{selectedMod.slug}</p>
            </div>
            <button className="glass-btn p-2" onClick={() => setSelectedMod(null)}>
              <X size={16} />
            </button>
          </div>

          {modDescription && (
            <div className="mb-4">
              <label className="text-[12px] text-[var(--text-3)] mb-1 block">{t('instances.modDescription')}</label>
              <p className="text-[13px] text-[var(--text-2)]">{modDescription}</p>
            </div>
          )}

          {modLatestVersion && (
            <div className="mb-4">
              <label className="text-[12px] text-[var(--text-3)] mb-1 block">{t('instances.modVersion')}</label>
              <p className="text-[13px] text-[var(--text-1)]">{modLatestVersion}</p>
            </div>
          )}

          <div className="mb-4">
            <label className="text-[12px] text-[var(--text-3)] mb-1 block">{t('instances.modDependencies')}</label>
            {modDependencies.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {modDependencies.map(dep => (
                  <span key={dep} className="text-[12px] px-3 py-1 rounded-full bg-white/[0.06] text-[var(--text-2)]">
                    {dep}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-[var(--text-2)]">{t('instances.noDependencies')}</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              className="glass-btn flex-1"
              onClick={() => { toggleResource(selectedMod.slug); setSelectedMod(null) }}
            >
              {selectedMod.enabled ? <ToggleLeft size={14} /> : <ToggleRight size={14} />}
              {selectedMod.enabled ? t('instances.disabled') : t('instances.enabled')}
            </button>
            <button
              className="glass-btn glass-btn-danger flex-1"
              onClick={() => { removeResource(selectedMod.slug); setSelectedMod(null) }}
            >
              <X size={14} />
              {t('accounts.remove')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
