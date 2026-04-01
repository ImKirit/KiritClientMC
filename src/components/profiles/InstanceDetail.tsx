import { useState, useRef } from 'react'
import { Search, Package, Plus, X, Download, ToggleLeft, ToggleRight, ChevronLeft, Clock, HardDrive, Gamepad2 } from 'lucide-react'
import type { Profile } from '../../stores/profileStore'

type ResourceType = 'mod' | 'resourcepack' | 'shader'

interface InstalledResource {
  slug: string
  title: string
  icon_url: string | null
  type: ResourceType
  enabled: boolean
}

interface ModrinthProject {
  slug: string
  title: string
  description: string
  icon_url: string | null
  downloads: number
  project_type: string
}

const tabs: { type: ResourceType; label: string; modrinthType: string }[] = [
  { type: 'mod', label: 'Mods', modrinthType: 'mod' },
  { type: 'resourcepack', label: 'Texture Packs', modrinthType: 'resourcepack' },
  { type: 'shader', label: 'Shaders', modrinthType: 'shader' },
]

interface InstanceDetailProps {
  profile: Profile
  onBack: () => void
}

export function InstanceDetail({ profile, onBack }: InstanceDetailProps) {
  const [activeTab, setActiveTab] = useState<ResourceType>('mod')
  const [installed, setInstalled] = useState<InstalledResource[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ModrinthProject[]>([])
  const [searching, setSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = async (q: string, type: ResourceType) => {
    if (!q.trim()) {
      setResults([])
      return
    }
    setSearching(true)
    try {
      const tab = tabs.find(t => t.type === type)!
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
    debounceRef.current = setTimeout(() => search(value, activeTab), 400)
  }

  const switchTab = (type: ResourceType) => {
    setActiveTab(type)
    setQuery('')
    setResults([])
    setShowSearch(false)
  }

  const addResource = (project: ModrinthProject) => {
    if (installed.some(r => r.slug === project.slug)) return
    setInstalled([...installed, {
      slug: project.slug,
      title: project.title,
      icon_url: project.icon_url,
      type: activeTab,
      enabled: true,
    }])
  }

  const removeResource = (slug: string) => {
    setInstalled(installed.filter(r => r.slug !== slug))
  }

  const toggleResource = (slug: string) => {
    setInstalled(installed.map(r =>
      r.slug === slug ? { ...r, enabled: !r.enabled } : r
    ))
  }

  const filteredInstalled = installed.filter(r => r.type === activeTab)
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
        Back to Instances
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
        {tabs.map(tab => (
          <button
            key={tab.type}
            className={`glass-btn text-[13px] px-4 py-2.5 ${activeTab === tab.type ? 'glass-btn-primary' : ''}`}
            onClick={() => switchTab(tab.type)}
          >
            {tab.label}
            {installed.filter(r => r.type === tab.type).length > 0 && (
              <span className="ml-1.5 text-[11px] opacity-60">
                ({installed.filter(r => r.type === tab.type).length})
              </span>
            )}
          </button>
        ))}
        <div className="flex-1" />
        <button
          className="glass-btn glass-btn-primary text-[13px] px-4 py-2.5"
          onClick={() => setShowSearch(!showSearch)}
        >
          <Plus size={14} />
          Add {tabs.find(t => t.type === activeTab)?.label}
        </button>
      </div>

      {/* Modrinth Search Panel */}
      {showSearch && (
        <div className="glass p-5 mb-4">
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
            <input
              className="glass-input pl-9"
              placeholder={`Search ${tabs.find(t => t.type === activeTab)?.label.toLowerCase()} on Modrinth...`}
              value={query}
              onChange={e => handleInput(e.target.value)}
              autoFocus
            />
          </div>

          {searching && (
            <p className="text-[12px] text-[var(--text-3)] mb-2">Searching...</p>
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
            <p className="text-[12px] text-[var(--text-3)]">No results found</p>
          )}
        </div>
      )}

      {/* Installed Resources List */}
      {filteredInstalled.length > 0 ? (
        <div className="flex flex-col gap-2">
          {filteredInstalled.map(resource => (
            <div
              key={resource.slug}
              className={`glass p-4 flex items-center gap-4 ${!resource.enabled ? 'opacity-50' : ''}`}
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
                  {resource.enabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  className="p-2 rounded-lg hover:bg-white/[0.08] transition-colors text-[var(--text-2)]"
                  onClick={() => toggleResource(resource.slug)}
                  title={resource.enabled ? 'Disable' : 'Enable'}
                >
                  {resource.enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                </button>
                <button
                  className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-red-400/60"
                  onClick={() => removeResource(resource.slug)}
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
            No {tabs.find(t => t.type === activeTab)?.label.toLowerCase()} installed
          </p>
          <p className="text-[12px] text-[var(--text-3)] mt-1">
            Click "Add {tabs.find(t => t.type === activeTab)?.label}" to search Modrinth
          </p>
        </div>
      )}
    </div>
  )
}
