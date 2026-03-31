import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Check, Copy, ExternalLink } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useDraggable } from '../lib/useDraggable'

export function AccountsPage() {
  const { accounts, loginFlow, isLoading, loadAccounts, startLogin, pollLogin, removeAccount, setActiveAccount, cancelLogin } = useAuthStore()
  const [copied, setCopied] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const drag = useDraggable()

  useEffect(() => {
    loadAccounts()
  }, [])

  useEffect(() => {
    if (loginFlow) {
      pollRef.current = setInterval(async () => {
        try {
          const result = await pollLogin()
          if (result) {
            if (pollRef.current) clearInterval(pollRef.current)
          }
        } catch {
          if (pollRef.current) clearInterval(pollRef.current)
        }
      }, 5000)
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
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
        <h1 className="text-xl font-semibold">Accounts</h1>
        <button className="glass-btn glass-btn-primary" onClick={startLogin} disabled={isLoading || !!loginFlow}>
          <Plus size={16} />
          Add Account
        </button>
      </div>

      {/* Login Flow Modal */}
      {loginFlow && (
        <div className="modal-overlay" onClick={cancelLogin}>
          <div className="modal-content" ref={drag.ref} onMouseDown={drag.onMouseDown} onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-5 cursor-grab select-none">Microsoft Login</h2>
            <p className="text-[14px] text-[var(--text-2)] mb-5">
              Go to the link below and enter this code:
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
              Open {loginFlow.verificationUri}
            </button>

            <div className="flex items-center gap-2 justify-center mb-5">
              <div className="w-2 h-2 rounded-full bg-white/20 animate-pulse" />
              <p className="text-[13px] text-[var(--text-3)]">Waiting for authorization...</p>
            </div>

            <button className="glass-btn w-full" onClick={cancelLogin}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Account List */}
      <div className="flex flex-col gap-4">
        {accounts.length === 0 ? (
          <div className="glass p-10 text-center">
            <p className="text-[var(--text-2)] text-[14px]">No accounts added yet</p>
            <p className="text-[var(--text-3)] text-[13px] mt-2">
              Click "Add Account" to login with Microsoft
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
                      Active
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
