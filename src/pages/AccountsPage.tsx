import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Check, Copy, ExternalLink, AlertTriangle } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { Modal } from '../components/ui/Modal'
import { useI18n } from '../lib/i18n'

export function AccountsPage() {
  const { accounts, loginFlow, isLoading, loadAccounts, startLogin, pollLogin, removeAccount, setActiveAccount, cancelLogin } = useAuthStore()
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollingBusy = useRef(false)

  useEffect(() => {
    loadAccounts()
  }, [])

  useEffect(() => {
    if (loginFlow) {
      setAuthError(null)

      // Clear any existing interval first
      if (pollRef.current) clearInterval(pollRef.current)
      pollingBusy.current = false

      pollRef.current = setInterval(async () => {
        // Skip if a poll request is already in flight
        if (pollingBusy.current) return
        pollingBusy.current = true

        try {
          const result = await pollLogin()
          if (result) {
            // Login succeeded — stop polling
            if (pollRef.current) {
              clearInterval(pollRef.current)
              pollRef.current = null
            }
          }
        } catch (e) {
          // Stop polling on error
          if (pollRef.current) {
            clearInterval(pollRef.current)
            pollRef.current = null
          }
          const msg = e instanceof Error ? e.message : String(e)
          // Ignore "already been used" — means auth chain completed
          if (!msg.includes('already been used')) {
            setAuthError(msg)
          }
        } finally {
          pollingBusy.current = false
        }
      }, 5000)
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [loginFlow])

  const copyCode = () => {
    if (loginFlow) {
      navigator.clipboard.writeText(loginFlow.userCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const openLink = async (url: string) => {
    try {
      const { open } = await import('@tauri-apps/plugin-shell')
      open(url)
    } catch {
      window.open(url, '_blank')
    }
  }

  return (
    <div className="max-w-[600px] mx-auto fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-semibold">{t('accounts.title')}</h1>
        <button className="glass-btn glass-btn-primary" onClick={async () => {
          try {
            setAuthError(null)
            await startLogin()
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e)
            setAuthError(msg)
          }
        }} disabled={isLoading || !!loginFlow}>
          <Plus size={16} />
          {t('accounts.addAccount')}
        </button>
      </div>

      {/* Login Flow Modal */}
      {loginFlow && (
        <Modal onClose={cancelLogin}>
          <h2 className="text-lg font-semibold mb-5">{t('accounts.msLogin')}</h2>
          <p className="text-[14px] text-[var(--text-2)] mb-5">
            {t('accounts.msLoginDesc')}
          </p>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 glass-input text-center text-xl font-mono font-bold tracking-[6px]">
              {loginFlow.userCode}
            </div>
            <button className="glass-btn" onClick={copyCode}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>

          <button
            className="glass-btn glass-btn-primary w-full mb-5"
            onClick={() => openLink(loginFlow.verificationUri)}
          >
            <ExternalLink size={16} />
            {t('accounts.openLink', { uri: loginFlow.verificationUri })}
          </button>

          <div className="flex items-center gap-2 justify-center mb-5">
            <div className="w-2 h-2 rounded-full bg-white/20 animate-pulse" />
            <p className="text-[13px] text-[var(--text-3)]">{t('accounts.waiting')}</p>
          </div>

          <button className="glass-btn w-full" onClick={cancelLogin}>
            {t('common.cancel')}
          </button>
        </Modal>
      )}

      {/* Auth Error */}
      {authError && (
        <div className="glass border-red-500/30! mb-6 p-5 flex items-start gap-4">
          <AlertTriangle size={20} className="text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[14px] font-medium text-red-400 mb-1">Login failed</p>
            <p className="text-[13px] text-[var(--text-2)] break-all">{authError}</p>
          </div>
          <button className="glass-btn p-1.5 text-[12px]" onClick={() => setAuthError(null)}>✕</button>
        </div>
      )}

      {/* Account List */}
      <div className="flex flex-col gap-4">
        {accounts.length === 0 ? (
          <div className="glass p-10 text-center">
            <p className="text-[var(--text-2)] text-[14px]">{t('accounts.noAccounts')}</p>
            <p className="text-[var(--text-3)] text-[13px] mt-2">
              {t('accounts.noAccountsHint')}
            </p>
          </div>
        ) : (
          accounts.map(account => (
            <div
              key={account.uuid}
              className={`glass flex items-center gap-5 p-5 cursor-pointer ${
                account.is_active ? 'border-white/[0.16]!' : ''
              }`}
              onClick={() => setActiveAccount(account.uuid)}
            >
              <div className="avatar w-[48px] h-[48px]">
                <img
                  src={`https://crafatar.com/avatars/${account.uuid}?size=48&overlay`}
                  alt={account.username}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-[15px]">{account.username}</span>
                  {account.is_active && (
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/[0.08] text-[var(--text-2)]">
                      {t('accounts.active')}
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-[var(--text-3)] font-mono mt-1">
                  {account.uuid.slice(0, 8)}...
                </p>
              </div>
              <button
                className="glass-btn glass-btn-danger p-2.5"
                onClick={(e) => { e.stopPropagation(); removeAccount(account.uuid) }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
