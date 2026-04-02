import { useState, useRef } from 'react'
import { Search, Download, Package, Plus, X } from 'lucide-react'
import { useI18n } from '../../lib/i18n'

type ResourceType = 'mod' | 'resourcepack' | 'shader'

interface ModrinthProject {
  slug: string
  title: string
  description: string
  icon_url: string | null
  downloads: number
  project_type: string
}

export interface ResourceEntry {
  slug: string
  title: string
  icon_url: string | null
  type: ResourceType
}

interface ResourceSearchProps {
  mcVersion: string
  loaderType: string
  resources: ResourceEntry[]
  onResourcesChange: (resources: ResourceEntry[]) => void
}

const tabKeys: { type: ResourceType; labelKey: string; modrinthType: string }[] = [
  { type: 'mod', labelKey: 'common.mods', modrinthType: 'mod' },
  { type: 'resourcepack', labelKey: 'common.texturePacks', modrinthType: 'resourcepack' },
  { type: 'shader', labelKey: 'common.shaders', modrinthType: 'shader' },
]

export function ResourceSearch({ mcVersion, loaderType, resources, onResourcesChange }: ResourceSearchProps) {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<ResourceType>('mod')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ModrinthProject[]>([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = async (q: string, type: ResourceType) => {
    if (!q.trim()) {
      setResults([])
      return
    }
    setSearching(true)
    try {
      const tab = tabKeys.find(t => t.type === type)!
      const facets: string[][] = [
        [`versions:${mcVersion}`],
        [`project_type:${tab.modrinthType}`],
      ]
      if (type === 'mod') {
        facets.push([`categories:${loaderType}`])
      }
      const params = new URLSearchParams({
        query: q,
        limit: '15',
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
  }

  const addResource = (project: ModrinthProject) => {
    if (resources.some(r => r.slug === project.slug)) return
    onResourcesChange([...resources, {
      slug: project.slug,
      title: project.title,
      icon_url: project.icon_url,
      type: activeTab,
    }])
  }

  const removeResource = (slug: string) => {
    onResourcesChange(resources.filter(r => r.slug !== slug))
  }

  const isAdded = (slug: string) => resources.some(r => r.slug === slug)

  const formatDownloads = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return String(n)
  }

  const filteredResources = resources.filter(r => r.type === activeTab)

  return (
    <div>
      <label className="text-[13px] text-[var(--text-2)] mb-3 block">Resources (Modrinth)</label>

      {/* Tabs */}
      <div className="flex gap-2 mb-3">
        {tabKeys.map(tab => (
          <button
            key={tab.type}
            className={`glass-btn text-[12px] px-3.5 py-2 ${activeTab === tab.type ? 'glass-btn-primary' : ''}`}
            onClick={() => switchTab(tab.type)}
          >
            {t(tab.labelKey)}
            {resources.filter(r => r.type === tab.type).length > 0 && (
              <span className="ml-1.5 text-[11px] opacity-60">
                ({resources.filter(r => r.type === tab.type).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Added resources for current tab */}
      {filteredResources.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {filteredResources.map(r => (
            <div key={r.slug} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-[12px]">
              {r.icon_url ? (
                <img src={r.icon_url} alt="" className="w-4 h-4 rounded object-cover" />
              ) : (
                <Package size={12} className="text-[var(--text-3)]" />
              )}
              <span className="max-w-[120px] truncate">{r.title}</span>
              <button
                className="p-0.5 rounded hover:bg-white/[0.1] transition-colors"
                onClick={() => removeResource(r.slug)}
              >
                <X size={12} className="text-[var(--text-3)]" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
        <input
          className="glass-input pl-9"
          placeholder={`${t('common.search')} ${t(tabKeys.find(tk => tk.type === activeTab)!.labelKey)}...`}
          value={query}
          onChange={e => handleInput(e.target.value)}
        />
      </div>

      {searching && (
        <p className="text-[12px] text-[var(--text-3)] mb-2">{t('common.searching')}</p>
      )}

      {results.length > 0 && (
        <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
          {results.map(project => (
            <div
              key={project.slug}
              className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-transparent hover:bg-white/[0.06] hover:border-white/[0.08] transition-all group"
            >
              {project.icon_url ? (
                <img src={project.icon_url} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0">
                  <Package size={14} className="text-[var(--text-3)]" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate">{project.title}</p>
                <p className="text-[11px] text-[var(--text-3)] truncate">{project.description}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-[var(--text-3)] flex items-center gap-1">
                  <Download size={10} />
                  {formatDownloads(project.downloads)}
                </span>
                {isAdded(project.slug) ? (
                  <button
                    className="p-1.5 rounded-lg bg-white/[0.08] text-[var(--text-3)]"
                    onClick={() => removeResource(project.slug)}
                  >
                    <X size={14} />
                  </button>
                ) : (
                  <button
                    className="p-1.5 rounded-lg hover:bg-white/[0.1] text-[var(--text-2)] transition-colors"
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
  )
}
