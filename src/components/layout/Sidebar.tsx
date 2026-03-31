import { NavLink } from 'react-router-dom'
import { Home, Users, FolderOpen, Settings, Sparkles } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

const links = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/accounts', icon: Users, label: 'Accounts' },
  { to: '/profiles', icon: FolderOpen, label: 'Profiles' },
  { to: '/cosmetics', icon: Sparkles, label: 'Cosmetics' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const activeAccount = useAuthStore(s => s.getActiveAccount())

  return (
    <aside className="glass-sidebar w-[var(--sidebar-width)] flex flex-col h-full">
      {/* Account Avatar */}
      <div className="p-4 pb-2">
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.03] transition-colors cursor-pointer">
          <div className="avatar">
            {activeAccount ? (
              <img
                src={`https://crafatar.com/avatars/${activeAccount.uuid}?size=36&overlay`}
                alt={activeAccount.username}
              />
            ) : (
              <div className="w-full h-full bg-white/[0.06] flex items-center justify-center">
                <Users size={16} className="text-[var(--text-3)]" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium truncate">
              {activeAccount?.username || 'Not logged in'}
            </p>
            <p className="text-[11px] text-[var(--text-3)]">
              {activeAccount ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-2 flex flex-col gap-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''}`
            }
          >
            <Icon size={18} strokeWidth={1.8} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Version Badge */}
      <div className="p-4 pt-2">
        <div className="text-[11px] text-[var(--text-3)] text-center">
          KiritClient v0.1.0
        </div>
      </div>
    </aside>
  )
}
