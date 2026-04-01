import { Outlet } from 'react-router-dom'
import { Titlebar } from './Titlebar'
import { Sidebar } from './Sidebar'
import { CursorGlow } from './CursorGlow'

export function Layout() {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[var(--bg)]">
      <div className="bg-orbs" />
      <CursorGlow />
      <Titlebar />
      <div className="flex flex-1 overflow-hidden relative z-10">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
