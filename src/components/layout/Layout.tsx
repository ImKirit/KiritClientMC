import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Titlebar } from './Titlebar'
import { Sidebar } from './Sidebar'
import { CursorGlow } from './CursorGlow'
import { useUpdateStore } from '../../stores/updateStore'
import { Download, X } from 'lucide-react'

function UpdateBanner() {
  const { updateAvailable, dismissed, dismiss } = useUpdateStore()

  if (!updateAvailable || dismissed) return null

  const openDownload = () => {
    window.open(updateAvailable.download_url, '_blank')
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white/[0.06] border-b border-white/[0.08] text-[13px] relative z-20">
      <Download size={14} className="text-white/60" />
      <span className="flex-1">
        <strong>KiritClient v{updateAvailable.version}</strong> is available!
        {updateAvailable.changelog && <span className="text-[var(--text-3)] ml-2">{updateAvailable.changelog}</span>}
      </span>
      <button
        className="glass-btn text-[12px] py-1 px-3"
        onClick={openDownload}
      >
        Update
      </button>
      <button
        className="text-[var(--text-3)] hover:text-white transition-colors"
        onClick={dismiss}
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function Layout() {
  const checkForUpdates = useUpdateStore(s => s.checkForUpdates)

  useEffect(() => {
    checkForUpdates()
  }, [])

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[var(--bg)]">
      <div className="bg-orbs" />
      <CursorGlow />
      <Titlebar />
      <UpdateBanner />
      <div className="flex flex-1 overflow-hidden relative z-10">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
