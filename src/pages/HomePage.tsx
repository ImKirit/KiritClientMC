import { useEffect } from 'react'
import { Play, ChevronDown, LogIn } from 'lucide-react'
import { useProfileStore } from '../stores/profileStore'
import { useAuthStore } from '../stores/authStore'
import { useLaunchStore } from '../stores/launchStore'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../lib/i18n'

export function HomePage() {
  const selectedProfile = useProfileStore(s => s.getSelectedProfile())
  const activeAccount = useAuthStore(s => s.getActiveAccount())
  const { isLaunching, progress, error, launchGame, setupListeners, reset } = useLaunchStore()
  const navigate = useNavigate()
  const { t } = useI18n()

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
    <div className="h-full flex flex-col relative fade-in">
      {/* Top Right Account */}
      <div className="absolute top-0 right-0 z-10">
        {activeAccount ? (
          <div
            className="flex items-center gap-3 glass px-4 py-2.5 cursor-pointer"
            onClick={() => navigate('/accounts')}
          >
            <div className="avatar w-[30px] h-[30px]">
              <img
                src={`https://crafatar.com/avatars/${activeAccount.uuid}?size=30&overlay`}
                alt={activeAccount.username}
              />
            </div>
            <span className="text-[13px] font-medium">{activeAccount.username}</span>
          </div>
        ) : (
          <button
            className="glass-btn text-[13px]"
            onClick={() => navigate('/accounts')}
          >
            <LogIn size={15} />
            {t('common.login')}
          </button>
        )}
      </div>

      {/* Center Content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-10 relative">
        {/* Player Skin Background */}
        {activeAccount && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <img
              src={`https://crafatar.com/renders/body/${activeAccount.uuid}?scale=10&overlay`}
              alt=""
              className="skin-render h-[380px] pointer-events-auto"
            />
          </div>
        )}

        {/* Selected Profile */}
        {selectedProfile && (
          <div
            className="glass px-7 py-5 flex items-center gap-5 min-w-[340px] cursor-pointer group relative z-10"
            onClick={() => navigate('/profiles')}
          >
            {selectedProfile.icon?.startsWith('data:') || selectedProfile.icon?.startsWith('http') ? (
              <img src={selectedProfile.icon} alt="" className="w-12 h-12 rounded-xl object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-white/[0.06] flex items-center justify-center text-2xl">
                {selectedProfile.icon === 'sword' ? '\u2694\uFE0F' :
                 selectedProfile.icon === 'pickaxe' ? '\u26CF\uFE0F' :
                 selectedProfile.icon === 'shield' ? '\uD83D\uDEE1\uFE0F' : '\uD83C\uDFAE'}
              </div>
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-[15px]">{selectedProfile.name}</h3>
              <p className="text-[13px] text-[var(--text-2)] mt-0.5">
                {selectedProfile.mc_version}{loaderLabel(selectedProfile.loader_type)}
              </p>
            </div>
            <ChevronDown size={18} className="text-[var(--text-3)] group-hover:text-[var(--text-2)] transition-colors" />
          </div>
        )}

        {/* Play Button */}
        <button
          className={`play-btn relative z-10 ${isLaunching ? 'launching' : ''}`}
          onClick={handlePlay}
          disabled={isLaunching || !selectedProfile}
        >
          {isLaunching ? (
            <span className="text-sm font-medium tracking-wider">
              {progress?.stage === 'running' ? t('home.running') : t('home.loading')}
            </span>
          ) : (
            <span className="flex items-center gap-3">
              <Play size={20} fill="white" />
              {t('home.play')}
            </span>
          )}
        </button>

        {/* Progress */}
        {isLaunching && progress && (
          <div className="w-[380px] fade-in relative z-10">
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{ width: `${(progress.progress || 0) * 100}%` }}
              />
            </div>
            <p className="text-[12px] text-[var(--text-3)] mt-3 text-center">
              {progress.message}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="glass px-6 py-4 border-[rgba(255,68,68,0.3)]! max-w-[420px] fade-in relative z-10">
            <p className="text-[13px] text-[#ff6666]">{error}</p>
            <button className="text-[12px] text-[var(--text-3)] mt-2 underline" onClick={reset}>
              {t('home.dismiss')}
            </button>
          </div>
        )}

        {/* Login hint */}
        {!activeAccount && (
          <p className="text-[13px] text-[var(--text-3)] relative z-10">
            {t('home.loginHint')}
          </p>
        )}
      </div>
    </div>
  )
}
