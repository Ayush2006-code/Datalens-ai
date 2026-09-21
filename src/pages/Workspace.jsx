import { useEffect, useRef, useState } from 'react'
import { Route, Routes, useNavigate, useSearchParams } from 'react-router-dom'
import Sidebar from '../components/Sidebar.jsx'
import Topbar from '../components/Topbar.jsx'
import ProcessingScreen from '../components/ProcessingScreen.jsx'
import UploadView from '../components/UploadView.jsx'
import WorkbooksView from '../components/WorkbooksView.jsx'
import DashboardView from '../components/DashboardView.jsx'
import SettingsView from '../components/SettingsView.jsx'
import HomeView from '../components/HomeView.jsx'
import { useWorkbook } from '../context/WorkbookContext.jsx'

export default function Workspace() {
  const { processing, loadDemoWorkbook } = useWorkbook()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const demoRequestedRef = useRef(false)

  useEffect(() => {
    if (searchParams.get('demo') === '1' && !demoRequestedRef.current) {
      demoRequestedRef.current = true
      setSearchParams({}, { replace: true })
      loadDemoWorkbook().then((wb) => {
        if (wb) navigate('/app/dashboard')
      })
    }
  }, [searchParams, setSearchParams, loadDemoWorkbook, navigate])

  return (
    <div className="h-screen flex bg-surface text-ink overflow-hidden">
      <Sidebar mobileOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMenuClick={() => setMobileMenuOpen(true)} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route index element={<HomeView />} />
            <Route path="upload" element={<UploadView />} />
            <Route path="workbooks" element={<WorkbooksView searchQuery={searchQuery} />} />
            <Route path="dashboard" element={<DashboardView />} />
            <Route path="settings" element={<SettingsView />} />
          </Routes>
        </main>
      </div>
      {processing.active && <ProcessingScreen label={processing.label} steps={processing.steps} />}
    </div>
  )
}
