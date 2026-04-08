import { useEffect } from 'react'
import { Play, LogIn, Clock, Layers, ChevronRight, User } from 'lucide-react'
import { useProfileStore, type Profile } from '../stores/profileStore'
import { useAuthStore } from '../stores/authStore'
import { useLaunchStore } from '../stores/launchStore'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../lib/i18n'

function formatPlaytime(minutes: number): string {
  if (!minutes || minutes < 1) return '0m'
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function getProfileEmoji(icon: string | undefined): string {
  if (icon === 'sword') return '⚔️'
  if (icon === 'pickaxe') return '⛏️'
  if (icon === 'shield') return '🛡️'
  return '🎮'
}

function ProfileIcon({ profile, size = 40 }: { profile: Profile; size?: number }) {
  const isImage = profile.icon?.startsWith('data:') || profile.icon?.startsWith('http')
  return (
    <div
      className="rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0 overflow-hidden"
      style={{ width: size, height: size }}
    >
      {isImage
        ? <img src={profile.icon} alt="" className="w-full h-full object-cover" />
        : <span style={{ fontSize: size * 0.45 }}>{getProfileEmoji(profile.icon)}</span>
      }
    </div>
  )
}

function loaderLabel(type: string): string {
  if (type === 'vanilla') return 'Vanilla'
  return type.charAt(0).toUpperCase() + type.slice(1)
}

export function HomePage() {
  const selectedProfile = useProfileStore(s => s.getSelectedProfile())
  const profiles = useProfileStore(s => s.profiles)
  const selectProfile = useProfileStore(s => s.selectProfile)
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
    if (!activeAccount) { navigate('/accounts'); return }
    if (!selectedProfile) return
    launchGame(selectedProfile.id)
  }

  const otherProfiles = profiles.filter(p => p.id !== selectedProfile?.id).slice(0, 4)
  const totalPlaytime = profiles.reduce((sum, p) => sum + (p.total_playtime || 0), 0)

  return (
    <div className="h-full flex flex-col gap-5 overflow-hidden fade-in">

      {/* ── Greeting row ─────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[19px] font-semibold text-[var(--text-1)] leading-tight">
            {activeAccount ? `Hey, ${activeAccount.username}!` : 'Welcome back!'}
          </h1>
          <p className="text-[12px] text-[var(--text-3)] mt-0.5">
            {selectedProfile
              ? `Playing ${selectedProfile.name} · ${selectedProfile.mc_version}`
              : 'Select a profile to get started'}
          </p>
        </div>

        {activeAccount ? (
          <div
            className="flex items-center gap-2.5 glass px-3 py-2 cursor-pointer"
            onClick={() => navigate('/accounts')}
          >
            <div className="avatar w-[26px] h-[26px]">
              <img
                src={`https://crafatar.com/avatars/${activeAccount.uuid}?size=26&overlay`}
                alt={activeAccount.username}
              />
            </div>
            <span className="text-[13px] font-medium">{activeAccount.username}</span>
          </div>
        ) : (
          <button className="glass-btn text-[13px]" onClick={() => navigate('/accounts')}>
            <LogIn size={14} />
            {t('common.login')}
          </button>
        )}
      </div>

      {/* ── Main content ─────────────────────────────────────── */}
      <div className="flex-1 flex gap-4 min-h-0">

        {/* Left: Play area */}
        <div className="flex-1 flex flex-col items-center justify-center relative gap-5">

          {/* Subtle skin background */}
          {activeAccount && (
            <div className="absolute inset-0 flex items-end justify-center pointer-events-none">
              <img
                src={`https://crafatar.com/renders/body/${activeAccount.uuid}?scale=9&overlay`}
                alt=""
                className="skin-render"
                style={{ height: 320, opacity: 0.06 }}
              />
            </div>
          )}

          {/* Profile selector card */}
          {selectedProfile ? (
            <div
              className="glass px-5 py-4 flex items-center gap-4 cursor-pointer group relative z-10"
              style={{ width: 300 }}
              onClick={() => navigate('/profiles')}
            >
              <ProfileIcon profile={selectedProfile} size={44} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[14px] truncate">{selectedProfile.name}</p>
                <p className="text-[12px] text-[var(--text-3)] mt-0.5">
                  {selectedProfile.mc_version} · {loaderLabel(selectedProfile.loader_type)}
                </p>
                {selectedProfile.total_playtime > 0 && (
                  <p className="text-[11px] text-[var(--text-3)] mt-0.5">
                    {formatPlaytime(selectedProfile.total_playtime)} played
                  </p>
                )}
              </div>
              <ChevronRight
                size={16}
                className="text-[var(--text-3)] group-hover:text-[var(--text-2)] transition-colors shrink-0"
              />
            </div>
          ) : (
            <button
              className="glass px-5 py-4 flex items-center gap-3 cursor-pointer group relative z-10 hover:bg-white/[0.055] transition-colors"
              style={{ width: 300 }}
              onClick={() => navigate('/profiles')}
            >
              <div className="w-11 h-11 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0">
                <Layers size={18} className="text-[var(--text-3)]" />
              </div>
              <span className="text-[14px] text-[var(--text-2)]">Select a profile</span>
              <ChevronRight size={16} className="text-[var(--text-3)] ml-auto" />
            </button>
          )}

          {/* Play button */}
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
            <div className="fade-in relative z-10" style={{ width: 300 }}>
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${(progress.progress || 0) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-[var(--text-3)] mt-2 text-center">{progress.message}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="glass px-5 py-3 fade-in relative z-10" style={{ maxWidth: 300, borderColor: 'rgba(255,68,68,0.3)' }}>
              <p className="text-[12px] text-[#ff6666]">{error}</p>
              <button className="text-[11px] text-[var(--text-3)] mt-1.5 underline" onClick={reset}>
                {t('home.dismiss')}
              </button>
            </div>
          )}

          {/* No account hint */}
          {!activeAccount && (
            <p className="text-[13px] text-[var(--text-3)] relative z-10">{t('home.loginHint')}</p>
          )}
        </div>

        {/* Right: Info panels */}
        <div className="flex flex-col gap-3 shrink-0" style={{ width: 210 }}>

          {/* Account card */}
          {activeAccount ? (
            <div
              className="glass p-4 flex flex-col items-center gap-3 cursor-pointer"
              onClick={() => navigate('/accounts')}
            >
              <img
                src={`https://crafatar.com/renders/body/${activeAccount.uuid}?scale=5&overlay`}
                alt={activeAccount.username}
                className="skin-render"
                style={{ height: 80, opacity: 0.85 }}
              />
              <div className="text-center">
                <p className="text-[13px] font-semibold">{activeAccount.username}</p>
                <p className="text-[11px] text-[var(--text-3)] mt-0.5">Microsoft Account</p>
              </div>
            </div>
          ) : (
            <button
              className="glass p-4 flex flex-col items-center gap-3 w-full"
              onClick={() => navigate('/accounts')}
            >
              <div className="w-12 h-12 rounded-xl bg-white/[0.05] flex items-center justify-center">
                <User size={22} className="text-[var(--text-3)]" />
              </div>
              <p className="text-[13px] text-[var(--text-2)]">Not logged in</p>
            </button>
          )}

          {/* Stats */}
          <div className="glass p-4 flex flex-col gap-3">
            <p className="text-[10px] text-[var(--text-3)] uppercase tracking-widest font-semibold">Stats</p>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0">
                <Clock size={13} className="text-[var(--text-2)]" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold leading-tight">{formatPlaytime(totalPlaytime)}</p>
                <p className="text-[10px] text-[var(--text-3)]">Total playtime</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0">
                <Layers size={13} className="text-[var(--text-2)]" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold leading-tight">{profiles.length}</p>
                <p className="text-[10px] text-[var(--text-3)]">
                  {profiles.length === 1 ? 'Profile' : 'Profiles'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick switch */}
          {otherProfiles.length > 0 && (
            <div className="glass p-4 flex flex-col gap-2 flex-1 min-h-0">
              <p className="text-[10px] text-[var(--text-3)] uppercase tracking-widest font-semibold mb-0.5">
                Quick Switch
              </p>
              {otherProfiles.map(p => (
                <button
                  key={p.id}
                  className="flex items-center gap-2.5 w-full text-left px-2 py-1.5 rounded-xl hover:bg-white/[0.05] transition-colors"
                  onClick={() => selectProfile(p.id)}
                >
                  <ProfileIcon profile={p} size={28} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium truncate leading-tight">{p.name}</p>
                    <p className="text-[10px] text-[var(--text-3)]">{p.mc_version}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
