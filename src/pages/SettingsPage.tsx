import { useEffect, useState, useRef } from 'react'
import { RefreshCw, HardDrive, Palette, Sparkles, Globe, MousePointer2, Zap, X, Plus, Search, Package, Download } from 'lucide-react'
import { useSettingsStore, type StandardPackage } from '../stores/settingsStore'
import { useI18n, type Locale } from '../lib/i18n'

const bgPresets = [
  { name: 'Default', bg: '#0e0e0e', orbs: 'rgba(255,255,255,0.05)' },
  { name: 'Midnight', bg: '#080812', orbs: 'rgba(80,80,255,0.06)' },
  { name: 'Ember', bg: '#120808', orbs: 'rgba(255,100,50,0.06)' },
  { name: 'Forest', bg: '#081208', orbs: 'rgba(50,255,100,0.05)' },
  { name: 'Violet', bg: '#100818', orbs: 'rgba(180,50,255,0.06)' },
  { name: 'Ocean', bg: '#081018', orbs: 'rgba(50,150,255,0.06)' },
]

const accentColors = [
  { name: 'White', color: '#ffffff' },
  { name: 'Blue', color: '#6699ff' },
  { name: 'Purple', color: '#aa66ff' },
  { name: 'Red', color: '#ff6666' },
  { name: 'Green', color: '#66ffaa' },
  { name: 'Gold', color: '#ffcc44' },
]

export function SettingsPage() {
  const { settings, detectedJava, isLoading, loadSettings, updateSettings, detectJava } = useSettingsStore()
  const { locale, setLocale, t } = useI18n()
  const [selectedBg, setSelectedBg] = useState(0)
  const [selectedAccent, setSelectedAccent] = useState(0)
  const [glowEnabled, setGlowEnabled] = useState(() => localStorage.getItem('glow-enabled') !== 'false')
  const [glowSize, setGlowSize] = useState(() => parseInt(localStorage.getItem('glow-size') || '150'))

  useEffect(() => {
    loadSettings()
    detectJava()
  }, [])

  const update = (partial: Partial<typeof settings>) => {
    updateSettings({ ...settings, ...partial })
  }

  const applyBg = (index: number) => {
    setSelectedBg(index)
    const preset = bgPresets[index]
    document.documentElement.style.setProperty('--bg', preset.bg)
    const orbs = document.querySelector('.bg-orbs') as HTMLElement
    if (orbs) {
      orbs.style.setProperty('--orb-color', preset.orbs)
    }
  }

  const applyAccent = (index: number) => {
    setSelectedAccent(index)
    const accent = accentColors[index]
    document.documentElement.style.setProperty('--text-1', accent.color)
  }

  return (
    <div className="max-w-[600px] mx-auto fade-in pb-8">
      <h1 className="text-xl font-semibold mb-8">{t('settings.title')}</h1>

      {/* Language */}
      <section className="glass p-7 mb-8">
        <div className="flex items-center gap-2 mb-6">
          <Globe size={16} className="text-[var(--text-2)]" />
          <h2 className="font-medium text-[15px]">{t('settings.language')}</h2>
        </div>
        <div className="flex gap-3">
          {([
            { code: 'en' as Locale, label: 'English', flag: '🇬🇧' },
            { code: 'de' as Locale, label: 'Deutsch', flag: '🇩🇪' },
          ]).map(lang => (
            <button
              key={lang.code}
              className={`glass-btn text-[13px] px-5 py-3 gap-3 ${
                locale === lang.code ? 'glass-btn-primary' : ''
              }`}
              onClick={() => setLocale(lang.code)}
            >
              <span className="text-base">{lang.flag}</span>
              {lang.label}
            </button>
          ))}
        </div>
      </section>

      {/* Appearance */}
      <section className="glass p-7 mb-8">
        <div className="flex items-center gap-2 mb-6">
          <Palette size={16} className="text-[var(--text-2)]" />
          <h2 className="font-medium text-[15px]">Appearance</h2>
        </div>

        {/* Background */}
        <div className="mb-6">
          <label className="text-[13px] text-[var(--text-2)] mb-3 block">Background Theme</label>
          <div className="grid grid-cols-3 gap-3">
            {bgPresets.map((preset, i) => (
              <button
                key={preset.name}
                className={`p-3 rounded-xl text-[13px] text-center transition-all ${
                  selectedBg === i
                    ? 'bg-white/[0.1] border border-white/[0.16]'
                    : 'bg-white/[0.03] border border-transparent hover:bg-white/[0.06]'
                }`}
                onClick={() => applyBg(i)}
              >
                <div
                  className="w-full h-8 rounded-lg mb-2"
                  style={{ background: preset.bg, border: '1px solid rgba(255,255,255,0.08)' }}
                />
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Accent Color */}
        <div>
          <label className="text-[13px] text-[var(--text-2)] mb-3 block">Accent Color</label>
          <div className="flex gap-3">
            {accentColors.map((accent, i) => (
              <button
                key={accent.name}
                className={`w-10 h-10 rounded-xl transition-all ${
                  selectedAccent === i
                    ? 'ring-2 ring-white/30 ring-offset-2 ring-offset-[var(--bg)]'
                    : 'hover:scale-110'
                }`}
                style={{ background: accent.color + '30', border: `2px solid ${accent.color}50` }}
                onClick={() => applyAccent(i)}
                title={accent.name}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Background Effects */}
      <section className="glass p-7 mb-8">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles size={16} className="text-[var(--text-2)]" />
          <h2 className="font-medium text-[15px]">Background Effects</h2>
        </div>

        <div className="flex flex-col gap-2">
          <label className="flex items-center justify-between py-3 cursor-pointer">
            <span className="text-[14px]">Animated orbs</span>
            <input
              type="checkbox"
              defaultChecked={true}
              onChange={(e) => {
                const orbs = document.querySelector('.bg-orbs') as HTMLElement
                if (orbs) orbs.style.display = e.target.checked ? '' : 'none'
              }}
              className="accent-white w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between py-3 cursor-pointer">
            <span className="text-[14px]">Glass blur effects</span>
            <input
              type="checkbox"
              defaultChecked={true}
              onChange={(e) => {
                document.documentElement.style.setProperty(
                  '--glass-blur', e.target.checked ? '24px' : '0px'
                )
              }}
              className="accent-white w-4 h-4"
            />
          </label>
        </div>
      </section>

      {/* Cursor Glow */}
      <section className="glass p-7 mb-8">
        <div className="flex items-center gap-2 mb-6">
          <MousePointer2 size={16} className="text-[var(--text-2)]" />
          <h2 className="font-medium text-[15px]">Cursor Glow</h2>
        </div>

        <label className="flex items-center justify-between py-3 cursor-pointer mb-2">
          <span className="text-[14px]">{t('settings.glowEnabled')}</span>
          <input
            type="checkbox"
            checked={glowEnabled}
            onChange={(e) => {
              const enabled = e.target.checked
              setGlowEnabled(enabled)
              localStorage.setItem('glow-enabled', String(enabled))
              const glow = document.querySelector('.cursor-glow') as HTMLElement
              if (glow) glow.style.display = enabled ? '' : 'none'
            }}
            className="accent-white w-4 h-4"
          />
        </label>

        {glowEnabled && (
          <div>
            <label className="text-[13px] text-[var(--text-2)] mb-2.5 block">
              {t('settings.glowSize')}: {glowSize}px
            </label>
            <input
              type="range"
              min="50"
              max="400"
              step="10"
              value={glowSize}
              onChange={e => {
                const size = parseInt(e.target.value)
                setGlowSize(size)
                localStorage.setItem('glow-size', String(size))
                document.documentElement.style.setProperty('--glow-size', `${size}px`)
              }}
              className="w-full accent-white"
            />
            <div className="flex justify-between text-[11px] text-[var(--text-3)] mt-1">
              <span>50px</span>
              <span>400px</span>
            </div>
          </div>
        )}
      </section>

      {/* Java */}
      <section className="glass p-7 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-medium text-[15px]">Java Installations</h2>
          <button className="glass-btn text-[13px] py-2" onClick={detectJava} disabled={isLoading}>
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Detect
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {detectedJava.length === 0 ? (
            <p className="text-[13px] text-[var(--text-3)]">No Java installations found</p>
          ) : (
            detectedJava.map(([path, version], i) => (
              <div key={i} className="flex items-center gap-4 p-3.5 rounded-lg bg-white/[0.025]">
                <HardDrive size={14} className="text-[var(--text-3)] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-mono truncate">{path}</p>
                  <p className="text-[11px] text-[var(--text-3)] mt-1">Java {version}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Performance */}
      <section className="glass p-7 mb-8">
        <h2 className="font-medium text-[15px] mb-6">Performance</h2>

        <div className="mb-6">
          <label className="text-[13px] text-[var(--text-2)] mb-2.5 block">
            Default Memory: {settings.default_memory_mb}MB
          </label>
          <input
            type="range"
            min="1024"
            max="16384"
            step="512"
            value={settings.default_memory_mb}
            onChange={e => update({ default_memory_mb: parseInt(e.target.value) })}
            className="w-full accent-white"
          />
        </div>

        <div>
          <label className="text-[13px] text-[var(--text-2)] mb-2.5 block">
            Download Threads: {settings.download_threads}
          </label>
          <input
            type="range"
            min="1"
            max="32"
            step="1"
            value={settings.download_threads}
            onChange={e => update({ download_threads: parseInt(e.target.value) })}
            className="w-full accent-white"
          />
        </div>
      </section>

      {/* Behavior */}
      <section className="glass p-7 mb-8">
        <h2 className="font-medium text-[15px] mb-6">Behavior</h2>

        <div className="flex flex-col gap-2">
          <label className="flex items-center justify-between py-3 cursor-pointer">
            <span className="text-[14px]">Close launcher on game start</span>
            <input
              type="checkbox"
              checked={settings.close_on_launch}
              onChange={e => update({ close_on_launch: e.target.checked })}
              className="accent-white w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between py-3 cursor-pointer">
            <span className="text-[14px]">Show game console</span>
            <input
              type="checkbox"
              checked={settings.show_console}
              onChange={e => update({ show_console: e.target.checked })}
              className="accent-white w-4 h-4"
            />
          </label>
        </div>
      </section>

      {/* Standard Packages */}
      <section className="glass p-7">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={16} className="text-[var(--text-2)]" />
          <h2 className="font-medium text-[15px]">{t('settings.standards')}</h2>
        </div>
        <p className="text-[12px] text-[var(--text-3)] mb-6">{t('settings.standardsDesc')}</p>

        {/* Standard Mods */}
        <StandardsList
          label={t('settings.standardMods')}
          type="mod"
          packages={settings.standard_packages}
          onChange={(pkgs) => update({ standard_packages: pkgs })}
        />

        {/* Standard Texture Packs */}
        <StandardsList
          label={t('settings.standardTexturePacks')}
          type="resourcepack"
          packages={settings.standard_packages}
          onChange={(pkgs) => update({ standard_packages: pkgs })}
        />

        {/* Standard Shaders */}
        <StandardsList
          label={t('settings.standardShaders')}
          type="shader"
          packages={settings.standard_packages}
          onChange={(pkgs) => update({ standard_packages: pkgs })}
        />
      </section>
    </div>
  )
}

interface ModrinthHit {
  slug: string
  title: string
  description: string
  icon_url: string | null
  downloads: number
}

const MODRINTH_TYPE: Record<string, string> = {
  mod: 'mod',
  resourcepack: 'resourcepack',
  shader: 'shader',
}

function StandardsList({ label, type, packages, onChange }: {
  label: string
  type: string
  packages: StandardPackage[]
  onChange: (pkgs: StandardPackage[]) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ModrinthHit[]>([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const filtered = packages.filter(p => p.resource_type === type)

  const search = async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setSearching(true)
    try {
      const facets = JSON.stringify([[`project_type:${MODRINTH_TYPE[type] ?? type}`]])
      const params = new URLSearchParams({ query: q, limit: '12', facets })
      const res = await fetch(`https://api.modrinth.com/v2/search?${params}`)
      const data = await res.json()
      setResults(data.hits || [])
    } catch { setResults([]) }
    setSearching(false)
  }

  const handleInput = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(value), 400)
  }

  const isAdded = (slug: string) => filtered.some(p => p.slug === slug || p.title === slug)

  const add = (hit: ModrinthHit) => {
    if (isAdded(hit.slug)) return
    onChange([...packages, {
      title: hit.title,
      resource_type: type,
      slug: hit.slug,
      icon_url: hit.icon_url,
    }])
  }

  const remove = (slug: string | undefined, title: string) => {
    onChange(packages.filter(p => !(
      p.resource_type === type && (slug ? p.slug === slug : p.title === title)
    )))
  }

  const formatDL = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
    return String(n)
  }

  return (
    <div className="mb-7 last:mb-0">
      <label className="text-[13px] text-[var(--text-2)] mb-3 block font-medium">
        {label} <span className="text-[var(--text-3)]">({filtered.length})</span>
      </label>

      {/* Added packages */}
      {filtered.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {filtered.map(pkg => (
            <span
              key={pkg.slug ?? pkg.title}
              className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.06] text-[var(--text-2)]"
            >
              {pkg.icon_url ? (
                <img src={pkg.icon_url} alt="" className="w-3.5 h-3.5 rounded object-cover" />
              ) : (
                <Package size={11} className="text-[var(--text-3)]" />
              )}
              <span className="max-w-[120px] truncate">{pkg.title}</span>
              <button
                className="hover:text-red-400 transition-colors ml-0.5"
                onClick={() => remove(pkg.slug, pkg.title)}
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative mb-2">
        <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
        <input
          className="glass-input pl-9 text-[13px]"
          placeholder={`Search ${label.toLowerCase()} on Modrinth...`}
          value={query}
          onChange={e => handleInput(e.target.value)}
        />
      </div>

      {searching && (
        <p className="text-[11px] text-[var(--text-3)] mb-2">Searching...</p>
      )}

      {/* Search results */}
      {results.length > 0 && (
        <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1">
          {results.map(hit => {
            const added = isAdded(hit.slug)
            return (
              <div
                key={hit.slug}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-transparent hover:bg-white/[0.055] hover:border-white/[0.07] transition-all"
              >
                {hit.icon_url ? (
                  <img src={hit.icon_url} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0">
                    <Package size={13} className="text-[var(--text-3)]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate">{hit.title}</p>
                  <p className="text-[11px] text-[var(--text-3)] truncate">{hit.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-[var(--text-3)] flex items-center gap-1">
                    <Download size={9} />
                    {formatDL(hit.downloads)}
                  </span>
                  {added ? (
                    <button
                      className="p-1.5 rounded-lg bg-white/[0.08] text-[var(--text-3)]"
                      onClick={() => remove(hit.slug, hit.title)}
                    >
                      <X size={13} />
                    </button>
                  ) : (
                    <button
                      className="p-1.5 rounded-lg hover:bg-white/[0.1] text-[var(--text-2)] transition-colors"
                      onClick={() => add(hit)}
                    >
                      <Plus size={13} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!searching && query && results.length === 0 && (
        <p className="text-[11px] text-[var(--text-3)]">No results found</p>
      )}
    </div>
  )
}
