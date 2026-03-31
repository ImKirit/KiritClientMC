import { useEffect } from 'react'
import { Play, ChevronDown } from 'lucide-react'
import { useProfileStore } from '../stores/profileStore'
import { useAuthStore } from '../stores/authStore'
import { useLaunchStore } from '../stores/launchStore'
import { useNavigate } from 'react-router-dom'

export function HomePage() {
  const selectedProfile = useProfileStore(s => s.getSelectedProfile())
  const activeAccount = useAuthStore(s => s.getActiveAccount())
  const { isLaunching, progress, error, launchGame, setupListeners, reset } = useLaunchStore()
  const navigate = useNavigate()

  useEffect(() => {
    let unlisten: (() => void) | undefined
    setupListeners().then(fn => { unlisten = fn })
    return () => { unlisten?.() }
  }, [])

  const handlePlay = () => {
    if (!activeAccount) {
      navigate('/accounts')
      return
    }
    if (!selectedProfile) return
    launchGame(selectedProfile.id)
  }

  const loaderLabel = (type: string) => {
    if (type === 'vanilla') return ''
    return ` + ${type.charAt(0).toUpperCase() + type.slice(1)}`
  }

  return (
    <div className="h-full flex flex-col items-center justify-center gap-8 fade-in">
      {/* Selected Profile */}
      {selectedProfile && (
        <div className="glass px-6 py-4 flex items-center gap-4 min-w-[320px] cursor-pointer group"
             onClick={() => navigate('/profiles')}>
          <div className="w-12 h-12 rounded-xl bg-white/[0.06] flex items-center justify-center text-2xl">
            {selectedProfile.icon === 'sword' ? '\u2694\uFE0F' :
             selectedProfile.icon === 'pickaxe' ? '\u26CF\uFE0F' :
             selectedProfile.icon === 'shield' ? '\uD83D\uDEE1\uFE0F' : '\uD83C\uDFAE'}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-[15px]">{selectedProfile.name}</h3>
            <p className="text-[13px] text-[var(--text-2)]">
              {selectedProfile.mc_version}{loaderLabel(selectedProfile.loader_type)}
            </p>
          </div>
          <ChevronDown size={18} className="text-[var(--text-3)] group-hover:text-[var(--text-2)] transition-colors" />
        </div>
      )}

      {/* Play Button */}
      <button
        className={`play-btn ${isLaunching ? 'launching' : ''}`}
        onClick={handlePlay}
        disabled={isLaunching || !selectedProfile}
      >
        {isLaunching ? (
          <span className="text-sm font-medium tracking-wider">
            {progress?.stage === 'running' ? 'RUNNING' : 'LOADING...'}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Play size={20} fill="white" />
            PLAY
          </span>
        )}
      </button>

      {/* Progress */}
      {isLaunching && progress && (
        <div className="w-[360px] fade-in">
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${(progress.progress || 0) * 100}%` }}
            />
          </div>
          <p className="text-[12px] text-[var(--text-3)] mt-2 text-center">
            {progress.message}
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="glass px-5 py-3 border-[rgba(255,68,68,0.3)]! max-w-[400px] fade-in">
          <p className="text-[13px] text-[#ff6666]">{error}</p>
          <button className="text-[12px] text-[var(--text-3)] mt-1 underline" onClick={reset}>
            Dismiss
          </button>
        </div>
      )}

      {/* Quick account info */}
      {!activeAccount && (
        <p className="text-[13px] text-[var(--text-3)]">
          Log in with a Microsoft account to play
        </p>
      )}
    </div>
  )
}
