import { useState } from 'react'
import { Upload, Shield } from 'lucide-react'

export function CosmeticsPage() {
  const [dragOver, setDragOver] = useState(false)

  return (
    <div className="max-w-[600px] mx-auto fade-in">
      <h1 className="text-xl font-semibold mb-8">Cosmetics</h1>

      {/* Cape Upload */}
      <section className="glass p-6 mb-5">
        <h3 className="font-medium text-[15px] mb-4">Your Cape</h3>
        <div
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-white/[0.25] bg-white/[0.04]'
              : 'border-white/[0.08] hover:border-white/[0.16]'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false) }}
        >
          <Upload size={28} className="mx-auto mb-3 text-[var(--text-3)]" />
          <p className="text-[14px] text-[var(--text-2)] mb-1">
            Drop a 64x32 PNG here or click to upload
          </p>
          <p className="text-[12px] text-[var(--text-3)]">
            Your cape will be visible to all KiritClient users
          </p>
        </div>
      </section>

      {/* Cape Preview */}
      <section className="glass p-6 mb-5">
        <h3 className="font-medium text-[15px] mb-4">Cape Preview</h3>
        <div className="flex items-center justify-center py-8">
          <div className="w-[128px] h-[64px] rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
            <p className="text-[12px] text-[var(--text-3)]">No cape</p>
          </div>
        </div>
      </section>

      {/* Creator Code */}
      <section className="glass p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="font-medium text-[15px]">Creator Code</h3>
          <Shield size={14} className="text-[var(--text-3)]" />
        </div>
        <p className="text-[13px] text-[var(--text-2)] mb-4">
          Enter a creator code to support your favorite content creator.
        </p>
        <div className="flex gap-3">
          <input
            className="glass-input"
            placeholder="Enter code..."
          />
          <button className="glass-btn glass-btn-primary whitespace-nowrap">Apply</button>
        </div>
        <p className="text-[11px] text-[var(--text-3)] mt-3">
          Only selected creators can generate codes.
        </p>
      </section>
    </div>
  )
}
