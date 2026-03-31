import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { HomePage } from './pages/HomePage'
import { AccountsPage } from './pages/AccountsPage'
import { ProfilesPage } from './pages/ProfilesPage'
import { SettingsPage } from './pages/SettingsPage'
import { CosmeticsPage } from './pages/CosmeticsPage'
import { SkinsPage } from './pages/SkinsPage'
import { useAuthStore } from './stores/authStore'
import { useProfileStore } from './stores/profileStore'
import { useSettingsStore } from './stores/settingsStore'

function App() {
  const loadAccounts = useAuthStore(s => s.loadAccounts)
  const loadProfiles = useProfileStore(s => s.loadProfiles)
  const loadSettings = useSettingsStore(s => s.loadSettings)

  useEffect(() => {
    loadAccounts().catch(() => {})
    loadProfiles().catch(() => {})
    loadSettings().catch(() => {})
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/profiles" element={<ProfilesPage />} />
          <Route path="/skins" element={<SkinsPage />} />
          <Route path="/cosmetics" element={<CosmeticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
