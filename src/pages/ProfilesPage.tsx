import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit, Clock, Gamepad2 } from 'lucide-react'
import { useProfileStore, type Profile, type LoaderType } from '../stores/profileStore'

export function ProfilesPage() {
  const { profiles, selectedProfileId, versions, fabricVersions, loadProfiles, createProfile, updateProfile, deleteProfile, selectProfile, fetchVersions, fetchFabricVersions } = useProfileStore()
  const [editing, setEditing] = useState<Profile | null>(null)
  const [showEditor, setShowEditor] = useState(false)

  useEffect(() => {
    loadProfiles()
    fetchVersions()
  }, [])

  const openNewProfile = () => {
    setEditing({
      id: '',
      name: 'New Profile',
      icon: 'sword',
      mc_version: versions.find(v => v.type === 'release')?.id || '1.21.4',
      loader_type: 'vanilla',
      loader_version: null,
      java_path: null,
      memory_mb: 4096,
      jvm_args: '',
      game_args: '',
      resolution_width: 854,
      resolution_height: 480,
      game_dir: '',
      last_played: null,
      total_playtime: 0,
      created: '',
    })
    setShowEditor(true)
  }

  const openEditProfile = (profile: Profile) => {
    setEditing({ ...profile })
    setShowEditor(true)
    if (profile.loader_type === 'fabric') {
      fetchFabricVersions(profile.mc_version)
    }
  }

  const saveProfile = async () => {
    if (!editing) return
    if (editing.id) {
      await updateProfile(editing)
    } else {
      await createProfile(editing)
    }
    setShowEditor(false)
    setEditing(null)
  }

  const handleLoaderChange = (type: LoaderType) => {
    if (!editing) return
    setEditing({ ...editing, loader_type: type, loader_version: null })
    if (type === 'fabric') {
      fetchFabricVersions(editing.mc_version)
    }
  }

  const handleVersionChange = (version: string) => {
    if (!editing) return
    setEditing({ ...editing, mc_version: version, loader_version: null })
    if (editing.loader_type === 'fabric') {
      fetchFabricVersions(version)
    }
  }

  const iconEmoji = (icon: string) => {
    switch (icon) {
      case 'sword': return '\u2694\uFE0F'
      case 'pickaxe': return '\u26CF\uFE0F'
      case 'shield': return '\uD83D\uDEE1\uFE0F'
      default: return '\uD83C\uDFAE'
    }
  }

  const releaseVersions = versions.filter(v => v.type === 'release')

  return (
    <div className="max-w-[700px] mx-auto fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Profiles</h1>
        <button className="glass-btn glass-btn-primary" onClick={openNewProfile}>
          <Plus size={16} />
          New Profile
        </button>
      </div>

      {/* Profile Grid */}
      <div className="grid grid-cols-2 gap-3">
        {profiles.map(profile => (
          <div
            key={profile.id}
            className={`glass p-4 cursor-pointer group ${
              selectedProfileId === profile.id ? 'border-white/[0.15]!' : ''
            }`}
            onClick={() => selectProfile(profile.id)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{iconEmoji(profile.icon)}</span>
                <div>
                  <h3 className="font-medium text-[14px]">{profile.name}</h3>
                  <p className="text-[12px] text-[var(--text-2)]">
                    {profile.mc_version}
                    {profile.loader_type !== 'vanilla' && ` + ${profile.loader_type}`}
                  </p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-1.5 rounded-lg hover:bg-white/[0.06]"
                        onClick={(e) => { e.stopPropagation(); openEditProfile(profile) }}>
                  <Edit size={14} className="text-[var(--text-2)]" />
                </button>
                <button className="p-1.5 rounded-lg hover:bg-red-500/10"
                        onClick={(e) => { e.stopPropagation(); deleteProfile(profile.id) }}>
                  <Trash2 size={14} className="text-red-400/60" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-[var(--text-3)]">
              <span className="flex items-center gap-1">
                <Gamepad2 size={12} />
                {profile.memory_mb}MB
              </span>
              {profile.last_played && (
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {new Date(profile.last_played).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Profile Editor Modal */}
      {showEditor && editing && (
        <div className="modal-overlay" onClick={() => setShowEditor(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-5">
              {editing.id ? 'Edit Profile' : 'New Profile'}
            </h2>

            <div className="flex flex-col gap-4">
              {/* Name */}
              <div>
                <label className="text-[13px] text-[var(--text-2)] mb-1.5 block">Name</label>
                <input
                  className="glass-input"
                  value={editing.name}
                  onChange={e => setEditing({ ...editing, name: e.target.value })}
                  placeholder="Profile name"
                />
              </div>

              {/* Icon */}
              <div>
                <label className="text-[13px] text-[var(--text-2)] mb-1.5 block">Icon</label>
                <div className="flex gap-2">
                  {['sword', 'pickaxe', 'shield', 'game'].map(icon => (
                    <button
                      key={icon}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${
                        editing.icon === icon
                          ? 'bg-white/[0.1] border border-white/[0.15]'
                          : 'bg-white/[0.03] border border-transparent hover:bg-white/[0.06]'
                      }`}
                      onClick={() => setEditing({ ...editing, icon })}
                    >
                      {iconEmoji(icon)}
                    </button>
                  ))}
                </div>
              </div>

              {/* MC Version */}
              <div>
                <label className="text-[13px] text-[var(--text-2)] mb-1.5 block">Minecraft Version</label>
                <select
                  className="glass-select"
                  value={editing.mc_version}
                  onChange={e => handleVersionChange(e.target.value)}
                >
                  {releaseVersions.map(v => (
                    <option key={v.id} value={v.id}>{v.id}</option>
                  ))}
                </select>
              </div>

              {/* Loader Type */}
              <div>
                <label className="text-[13px] text-[var(--text-2)] mb-1.5 block">Mod Loader</label>
                <div className="flex gap-2">
                  {(['vanilla', 'fabric', 'forge', 'neoforge', 'quilt'] as LoaderType[]).map(type => (
                    <button
                      key={type}
                      className={`glass-btn text-[13px] px-3 py-2 ${
                        editing.loader_type === type ? 'glass-btn-primary' : ''
                      }`}
                      onClick={() => handleLoaderChange(type)}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fabric Loader Version */}
              {editing.loader_type === 'fabric' && fabricVersions.length > 0 && (
                <div>
                  <label className="text-[13px] text-[var(--text-2)] mb-1.5 block">Fabric Version</label>
                  <select
                    className="glass-select"
                    value={editing.loader_version || ''}
                    onChange={e => setEditing({ ...editing, loader_version: e.target.value || null })}
                  >
                    <option value="">Latest Stable</option>
                    {fabricVersions.map(v => (
                      <option key={v.loader.version} value={v.loader.version}>
                        {v.loader.version} {v.loader.stable ? '(stable)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Memory */}
              <div>
                <label className="text-[13px] text-[var(--text-2)] mb-1.5 block">
                  Memory: {editing.memory_mb}MB
                </label>
                <input
                  type="range"
                  min="1024"
                  max="16384"
                  step="512"
                  value={editing.memory_mb}
                  onChange={e => setEditing({ ...editing, memory_mb: parseInt(e.target.value) })}
                  className="w-full accent-white"
                />
                <div className="flex justify-between text-[11px] text-[var(--text-3)]">
                  <span>1GB</span>
                  <span>16GB</span>
                </div>
              </div>

              {/* Save/Cancel */}
              <div className="flex gap-3 mt-2">
                <button className="glass-btn flex-1" onClick={() => setShowEditor(false)}>
                  Cancel
                </button>
                <button className="glass-btn glass-btn-primary flex-1" onClick={saveProfile}>
                  {editing.id ? 'Save' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
