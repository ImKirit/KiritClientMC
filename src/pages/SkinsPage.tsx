import { useState } from 'react'
import { Upload, Check, Trash2 } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

interface SkinEntry {
  id: string
  name: string
  data: string
  slim: boolean
}

export function SkinsPage() {
  const activeAccount = useAuthStore(s => s.getActiveAccount())
  const [skins, setSkins] = useState<SkinEntry[]>([])
  const [activeSkinId, setActiveSkinId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleUpload = (file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = e.target?.result as string
      const name = file.name.replace(/\.[^.]+$/, '')
      const id = crypto.randomUUID()
      setSkins(prev => [...prev, { id, name, data, slim: false }])
    }
    reader.readAsDataURL(file)
  }

  const handleFileInput = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/png'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) handleUpload(file)
    }
    input.click()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }

  const equipSkin = (id: string) => {
    setActiveSkinId(id)
  }

  const removeSkin = (id: string) => {
    setSkins(prev => prev.filter(s => s.id !== id))
    if (activeSkinId === id) setActiveSkinId(null)
  }

  const activeSkin = skins.find(s => s.id === activeSkinId)

  return (
    <div className="max-w-[700px] mx-auto fade-in pb-8">
      <h1 className="text-xl font-semibold mb-8">Skins</h1>

      <div className="grid grid-cols-[1fr_220px] gap-6">
        {/* Left: Upload + Skin List */}
        <div>
          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all mb-6 ${
              dragOver
                ? 'border-white/[0.25] bg-white/[0.04]'
                : 'border-white/[0.08] hover:border-white/[0.16]'
            }`}
            onClick={handleFileInput}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <Upload size={24} className="mx-auto mb-3 text-[var(--text-3)]" />
            <p className="text-[14px] text-[var(--text-2)] mb-1">
              Drop a 64x64 skin PNG or click to upload
            </p>
            <p className="text-[12px] text-[var(--text-3)]">
              Supports classic (4px arms) and slim (3px arms)
            </p>
          </div>

          {/* Skin List */}
          <div className="flex flex-col gap-3">
            {skins.length === 0 ? (
              <div className="glass p-6 text-center">
                <p className="text-[13px] text-[var(--text-3)]">No skins uploaded yet</p>
              </div>
            ) : (
              skins.map(skin => (
                <div
                  key={skin.id}
                  className={`glass flex items-center gap-4 p-4 cursor-pointer ${
                    activeSkinId === skin.id ? 'border-white/[0.16]!' : ''
                  }`}
                  onClick={() => equipSkin(skin.id)}
                >
                  <img
                    src={skin.data}
                    alt={skin.name}
                    className="w-10 h-10 rounded-lg object-cover"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium truncate">{skin.name}</p>
                    <p className="text-[11px] text-[var(--text-3)]">
                      {skin.slim ? 'Slim (Alex)' : 'Classic (Steve)'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeSkinId === skin.id && (
                      <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.08] text-[var(--text-2)]">
                        Equipped
                      </span>
                    )}
                    <button
                      className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
                      onClick={(e) => { e.stopPropagation(); setSkins(prev => prev.map(s => s.id === skin.id ? { ...s, slim: !s.slim } : s)) }}
                      title="Toggle slim/classic"
                    >
                      <span className="text-[11px] text-[var(--text-3)]">{skin.slim ? 'Slim' : 'Classic'}</span>
                    </button>
                    <button
                      className="glass-btn glass-btn-danger p-2"
                      onClick={(e) => { e.stopPropagation(); removeSkin(skin.id) }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Preview */}
        <div className="glass p-5">
          <h3 className="text-[13px] text-[var(--text-2)] mb-4 text-center">Preview</h3>
          <div className="flex items-center justify-center" style={{ minHeight: 280 }}>
            {activeSkin ? (
              <div className="flex flex-col items-center gap-4">
                <img
                  src={activeSkin.data}
                  alt={activeSkin.name}
                  className="w-[128px] h-[128px]"
                  style={{ imageRendering: 'pixelated' }}
                />
                <p className="text-[13px] font-medium">{activeSkin.name}</p>
                <div className="flex items-center gap-2 text-[var(--text-2)]">
                  <Check size={14} />
                  <span className="text-[12px]">Equipped</span>
                </div>
              </div>
            ) : activeAccount ? (
              <div className="flex flex-col items-center gap-4">
                <img
                  src={`https://crafatar.com/renders/body/${activeAccount.uuid}?scale=6&overlay`}
                  alt={activeAccount.username}
                  className="h-[200px]"
                  style={{ imageRendering: 'pixelated' }}
                />
                <p className="text-[12px] text-[var(--text-3)]">Current skin</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-[13px] text-[var(--text-3)]">Login to see your skin</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
