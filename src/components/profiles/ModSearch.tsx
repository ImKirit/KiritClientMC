import { useState, useRef } from 'react'
import { Search, Download, ExternalLink, Package } from 'lucide-react'

interface ModrinthProject {
  slug: string
  title: string
  description: string
  icon_url: string | null
  downloads: number
  project_type: string
  categories: string[]
}

interface ModSearchProps {
  mcVersion: string
  loaderType: string
}

export function ModSearch({ mcVersion, loaderType }: ModSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ModrinthProject[]>([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = async (q: string) => {
    if (!q.trim()) {
      setResults([])
      return
    }
    setSearching(true)
    try {
      const facets = [
        [`versions:${mcVersion}`],
        [`categories:${loaderType}`],
        ['project_type:mod'],
      ]
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
    debounceRef.current = setTimeout(() => search(value), 400)
  }

  const formatDownloads = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return String(n)
  }

  const openModPage = async (slug: string) => {
    const url = `https://modrinth.com/mod/${slug}`
    try {
      const { open } = await import('@tauri-apps/plugin-shell')
      open(url)
    } catch {
      window.open(url, '_blank')
    }
  }

  return (
    <div>
      <label className="text-[13px] text-[var(--text-2)] mb-2 block">Search Mods (Modrinth)</label>
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
        <input
          className="glass-input pl-9"
          placeholder={`Search mods for ${mcVersion} + ${loaderType}...`}
          value={query}
          onChange={e => handleInput(e.target.value)}
        />
      </div>

      {searching && (
        <p className="text-[12px] text-[var(--text-3)] mb-2">Searching...</p>
      )}

      {results.length > 0 && (
        <div className="flex flex-col gap-2 max-h-[240px] overflow-y-auto pr-1">
          {results.map(mod => (
            <div
              key={mod.slug}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-transparent hover:bg-white/[0.06] hover:border-white/[0.08] transition-all cursor-pointer group"
              onClick={() => openModPage(mod.slug)}
            >
              {mod.icon_url ? (
                <img src={mod.icon_url} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0">
                  <Package size={16} className="text-[var(--text-3)]" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate">{mod.title}</p>
                <p className="text-[11px] text-[var(--text-3)] truncate">{mod.description}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[11px] text-[var(--text-3)] flex items-center gap-1">
                  <Download size={11} />
                  {formatDownloads(mod.downloads)}
                </span>
                <ExternalLink size={13} className="text-[var(--text-3)] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!searching && query && results.length === 0 && (
        <p className="text-[12px] text-[var(--text-3)]">No mods found for "{query}"</p>
      )}
    </div>
  )
}
