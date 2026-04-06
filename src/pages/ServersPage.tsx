import { Star, Globe, Copy, Check } from 'lucide-react'
import { useState } from 'react'

interface ServerInfo {
  name: string
  address: string
  description: string
  icon: string
}

const featuredServers: ServerInfo[] = [
  {
    name: 'KiritSMP',
    address: 'mc.kirit.xyz',
    description: 'Official KiritClient Server',
    icon: '⭐',
  },
]

const recommendedServers: ServerInfo[] = [
  {
    name: 'Cytooxien',
    address: 'cytooxien.de',
    description: 'German Minigames Network',
    icon: '🎮',
  },
  {
    name: 'Hypixel',
    address: 'mc.hypixel.net',
    description: 'Largest Minecraft Server',
    icon: '🏆',
  },
  {
    name: 'DonutSMP',
    address: 'donutsmp.net',
    description: 'Survival Multiplayer',
    icon: '🍩',
  },
  {
    name: 'HugoSMP',
    address: 'hugosmp.net',
    description: 'Survival Multiplayer',
    icon: '🌍',
  },
  {
    name: 'Havoc Games',
    address: 'play.havoc.games',
    description: 'Minigames & PvP',
    icon: '⚔️',
  },
]

function ServerCard({ server, featured }: { server: ServerInfo; featured?: boolean }) {
  const [copied, setCopied] = useState(false)

  const copyAddress = () => {
    navigator.clipboard.writeText(server.address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`glass p-4 flex items-center gap-4 group ${featured ? 'border-white/[0.12]!' : ''}`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${featured ? 'bg-white/[0.08]' : 'bg-white/[0.04]'}`}>
        {server.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-[14px]">{server.name}</h3>
          {featured && <Star size={12} className="text-white/60" fill="currentColor" />}
        </div>
        <p className="text-[12px] text-[var(--text-3)] mt-0.5">{server.description}</p>
        <p className="text-[12px] text-[var(--text-2)] mt-1 font-mono">{server.address}</p>
      </div>
      <button
        className="glass-btn text-[12px] opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={copyAddress}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? 'Copied' : 'Copy IP'}
      </button>
    </div>
  )
}

export function ServersPage() {
  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-6 fade-in">
      <h1 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <Globe size={22} />
        Servers
      </h1>

      {/* Featured */}
      <div className="mb-8">
        <h2 className="text-[13px] font-medium text-[var(--text-2)] uppercase tracking-wider mb-3 flex items-center gap-2">
          <Star size={14} />
          Featured
        </h2>
        <div className="flex flex-col gap-3">
          {featuredServers.map(server => (
            <ServerCard key={server.address} server={server} featured />
          ))}
        </div>
      </div>

      {/* Recommended */}
      <div>
        <h2 className="text-[13px] font-medium text-[var(--text-2)] uppercase tracking-wider mb-3 flex items-center gap-2">
          <Globe size={14} />
          Recommended
        </h2>
        <div className="flex flex-col gap-3">
          {recommendedServers.map(server => (
            <ServerCard key={server.address} server={server} />
          ))}
        </div>
      </div>
    </div>
  )
}
