import { useEffect } from 'react'
import { RefreshCw, HardDrive } from 'lucide-react'
import { useSettingsStore } from '../stores/settingsStore'

export function SettingsPage() {
  const { settings, detectedJava, isLoading, loadSettings, updateSettings, detectJava } = useSettingsStore()

  useEffect(() => {
    loadSettings()
    detectJava()
  }, [])

  const update = (partial: Partial<typeof settings>) => {
    updateSettings({ ...settings, ...partial })
  }

  return (
    <div className="max-w-[600px] mx-auto fade-in">
      <h1 className="text-xl font-semibold mb-6">Settings</h1>

      {/* Java */}
      <section className="glass p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-[15px]">Java Installations</h2>
          <button className="glass-btn text-[13px] py-1.5" onClick={detectJava} disabled={isLoading}>
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Detect
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {detectedJava.length === 0 ? (
            <p className="text-[13px] text-[var(--text-3)]">No Java installations found</p>
          ) : (
            detectedJava.map(([path, version], i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02]">
                <HardDrive size={14} className="text-[var(--text-3)]" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-mono truncate">{path}</p>
                  <p className="text-[11px] text-[var(--text-3)]">Java {version}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Performance */}
      <section className="glass p-5 mb-4">
        <h2 className="font-medium text-[15px] mb-4">Performance</h2>

        <div className="mb-4">
          <label className="text-[13px] text-[var(--text-2)] mb-1.5 block">
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
          <label className="text-[13px] text-[var(--text-2)] mb-1.5 block">
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
      <section className="glass p-5">
        <h2 className="font-medium text-[15px] mb-4">Behavior</h2>

        <label className="flex items-center justify-between py-2 cursor-pointer">
          <span className="text-[14px]">Close launcher on game start</span>
          <input
            type="checkbox"
            checked={settings.close_on_launch}
            onChange={e => update({ close_on_launch: e.target.checked })}
            className="accent-white w-4 h-4"
          />
        </label>

        <label className="flex items-center justify-between py-2 cursor-pointer">
          <span className="text-[14px]">Show game console</span>
          <input
            type="checkbox"
            checked={settings.show_console}
            onChange={e => update({ show_console: e.target.checked })}
            className="accent-white w-4 h-4"
          />
        </label>
      </section>
    </div>
  )
}
