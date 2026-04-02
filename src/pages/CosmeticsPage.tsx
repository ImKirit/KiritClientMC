import { useState } from 'react'
import { Upload, Shield } from 'lucide-react'
import { useI18n } from '../lib/i18n'

export function CosmeticsPage() {
  const { t } = useI18n()
  const [dragOver, setDragOver] = useState(false)

  return (
    <div className="max-w-[600px] mx-auto fade-in">
      <h1 className="text-xl font-semibold mb-8">{t('cosmetics.title')}</h1>

      {/* Cape Upload */}
      <section className="glass p-6 mb-5">
        <h3 className="font-medium text-[15px] mb-4">{t('cosmetics.yourCape')}</h3>
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
            {t('cosmetics.capeDrop')}
          </p>
          <p className="text-[12px] text-[var(--text-3)]">
            {t('cosmetics.capeVisible')}
          </p>
        </div>
      </section>

      {/* Cape Preview */}
      <section className="glass p-6 mb-5">
        <h3 className="font-medium text-[15px] mb-4">{t('cosmetics.capePreview')}</h3>
        <div className="flex items-center justify-center py-8">
          <div className="w-[128px] h-[64px] rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
            <p className="text-[12px] text-[var(--text-3)]">{t('cosmetics.noCape')}</p>
          </div>
        </div>
      </section>

      {/* Creator Code */}
      <section className="glass p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="font-medium text-[15px]">{t('cosmetics.creatorCode')}</h3>
          <Shield size={14} className="text-[var(--text-3)]" />
        </div>
        <p className="text-[13px] text-[var(--text-2)] mb-4">
          {t('cosmetics.creatorDesc')}
        </p>
        <div className="flex gap-3">
          <input
            className="glass-input"
            placeholder={t('cosmetics.enterCode')}
          />
          <button className="glass-btn glass-btn-primary whitespace-nowrap">{t('cosmetics.apply')}</button>
        </div>
        <p className="text-[11px] text-[var(--text-3)] mt-3">
          {t('cosmetics.creatorNote')}
        </p>
      </section>
    </div>
  )
}
