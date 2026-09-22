import { useEffect, useRef, useState } from 'react'
import { Route, Routes, useNavigate, useSearchParams } from 'react-router-dom'

import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import HomeView from '../components/HomeView'
import UploadView from '../components/UploadView'
import WorkbooksView from '../components/WorkbooksView'
import DashboardView from '../components/DashboardView'
import SettingsView from '../components/SettingsView'
import ProcessingScreen from '../components/ProcessingScreen'

import { useWorkbook } from '../context/WorkbookContext.jsx'

export default function Workspace() {
  const { processing, loadDemoWorkbook } = useWorkbook()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchParams] = useSearchParams()

  const navigate = useNavigate()
  const demoRequestedRef = useRef(false)

  useEffect(() => {
    if (
      searchParams.get('demo') === '1' &&
      !demoRequestedRef.current
    ) {
      demoRequestedRef.current = true

      loadDemoWorkbook().then((workbook) => {
        if (workbook) {
          navigate('/app/dashboard')
        }
      })
    }
  }, [searchParams, loadDemoWorkbook, navigate])

  const handleUploadSuccess = (workbookId) => {
    if (!workbookId) {
      console.error('Upload succeeded but no workbook ID was returned.')
      return
    }

    sessionStorage.setItem(
      'datalens.activeWorkbookId',
      workbookId,
    )

    navigate('/app/dashboard')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0">
        <Topbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onMenuClick={() => setMobileMenuOpen(true)}
        />

        <main className="min-h-[calc(100vh-64px)]">
          <Routes>
            {/* Home */}
            <Route
              index
              element={<HomeView />}
            />

            {/* Upload */}
            <Route
              path="upload"
              element={
                <UploadView
                  onUploadSuccess={handleUploadSuccess}
                />
              }
            />

            {/* Workbooks
                DashboardView already contains WorkbooksView
                and handles workbook selection + dataset loading.
            */}
            <Route
              path="workbooks"
              element={<DashboardView />}
            />

            {/* Dashboard */}
            <Route
              path="dashboard"
              element={<DashboardView />}
            />

            {/* Settings */}
            <Route
              path="settings"
              element={<SettingsView />}
            />

            {/* Fallback */}
            <Route
              path="*"
              element={<HomeView />}
            />
          </Routes>
        </main>
      </div>

      {processing?.active && (
        <ProcessingScreen
          steps={processing.steps}
          label={processing.label}
        />
      )}
    </div>
  )
}