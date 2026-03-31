import { Upload, Sparkles } from 'lucide-react'

export function CosmeticsPage() {
  return (
    <div className="max-w-[600px] mx-auto fade-in">
      <h1 className="text-xl font-semibold mb-6">Cosmetics</h1>

      <div className="glass p-8 text-center">
        <Sparkles size={40} className="mx-auto mb-4 text-[var(--text-3)]" strokeWidth={1.5} />
        <h2 className="font-medium text-[16px] mb-2">Coming Soon</h2>
        <p className="text-[14px] text-[var(--text-2)] mb-1">
          Custom Capes, Name Effects, Creator Codes
        </p>
        <p className="text-[13px] text-[var(--text-3)]">
          Cosmetics will be visible to all KiritClient users
        </p>
      </div>

      {/* Cape Preview Placeholder */}
      <div className="glass p-5 mt-4">
        <h3 className="font-medium text-[14px] mb-3">Cape Upload</h3>
        <div className="border-2 border-dashed border-white/[0.08] rounded-xl p-8 text-center cursor-pointer hover:border-white/[0.15] transition-colors">
          <Upload size={24} className="mx-auto mb-2 text-[var(--text-3)]" />
          <p className="text-[13px] text-[var(--text-3)]">
            Drop a 64x32 PNG here or click to upload
          </p>
        </div>
      </div>

      {/* Cosmetics Grid Placeholder */}
      <div className="glass p-5 mt-4">
        <h3 className="font-medium text-[14px] mb-3">Name Effects</h3>
        <div className="grid grid-cols-3 gap-2">
          {['Glow', 'Rainbow', 'Pulse', 'Fade', 'Gradient', 'Neon'].map(effect => (
            <button key={effect} className="glass-btn text-[13px] py-3 opacity-40 cursor-not-allowed">
              {effect}
            </button>
          ))}
        </div>
      </div>

      {/* Creator Code Placeholder */}
      <div className="glass p-5 mt-4">
        <h3 className="font-medium text-[14px] mb-3">Creator Code</h3>
        <div className="flex gap-2">
          <input
            className="glass-input"
            placeholder="Enter creator code..."
            disabled
          />
          <button className="glass-btn opacity-40 cursor-not-allowed">Apply</button>
        </div>
      </div>
    </div>
  )
}
