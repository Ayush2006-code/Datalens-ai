import { useEffect, useRef, useState } from 'react'
import {
  Route,
  Routes,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'

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
  const {
    processing,
    loadDemoWorkbook,
  } = useWorkbook()

  const [
    mobileMenuOpen,
    setMobileMenuOpen,
  ] = useState(false)

  const [
    searchQuery,
    setSearchQuery,
  ] = useState('')

  const [
    searchParams,
  ] = useSearchParams()

  const navigate = useNavigate()

  const demoRequestedRef =
    useRef(false)

  /* =====================================================
     DEMO WORKBOOK
  ===================================================== */

  useEffect(() => {
    if (
      searchParams.get('demo') === '1' &&
      !demoRequestedRef.current
    ) {
      demoRequestedRef.current = true

      loadDemoWorkbook().then(
        (workbook) => {
          if (workbook) {
            navigate(
              '/app/dashboard',
            )
          }
        },
      )
    }
  }, [
    searchParams,
    loadDemoWorkbook,
    navigate,
  ])

  /* =====================================================
     UPLOAD SUCCESS
  ===================================================== */

  const handleUploadSuccess = (
    workbookId,
  ) => {
    if (!workbookId) {
      console.error(
        'Upload succeeded but no workbook ID was returned.',
      )

      return
    }

    sessionStorage.setItem(
      'datalens.activeWorkbookId',
      workbookId,
    )

    navigate(
      '/app/dashboard',
    )
  }

  /* =====================================================
     OPEN WORKBOOK
  ===================================================== */

  const handleSelectWorkbook = (
    workbookId,
  ) => {
    if (!workbookId) {
      return
    }

    sessionStorage.setItem(
      'datalens.activeWorkbookId',
      workbookId,
    )

    navigate(
      '/app/dashboard',
    )
  }

  /* =====================================================
     MOBILE MENU
  ===================================================== */

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  /* =====================================================
     LAYOUT
  ===================================================== */

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <Sidebar
        mobileOpen={
          mobileMenuOpen
        }
        onClose={
          closeMobileMenu
        }
      />

      {/* =================================================
          MAIN AREA
      ================================================= */}

      <div className="flex-1 min-w-0">

        <Topbar
          searchQuery={
            searchQuery
          }
          setSearchQuery={
            setSearchQuery
          }
          onMenuClick={() =>
            setMobileMenuOpen(
              true,
            )
          }
        />

        <main className="min-h-[calc(100vh-64px)]">

          <Routes>

            {/* =================================================
                HOME
            ================================================= */}

            <Route
              index
              element={
                <HomeView />
              }
            />

            {/* =================================================
                UPLOAD
            ================================================= */}

            <Route
              path="upload"
              element={
                <UploadView
                  onUploadSuccess={
                    handleUploadSuccess
                  }
                />
              }
            />

            {/* =================================================
                WORKBOOKS
            ================================================= */}

            <Route
              path="workbooks"
              element={
                <WorkbooksView
                  onSelectWorkbook={
                    handleSelectWorkbook
                  }
                  onUploadNew={() =>
                    navigate(
                      '/app/upload',
                    )
                  }
                />
              }
            />

            {/* =================================================
                DASHBOARD
            ================================================= */}

            <Route
              path="dashboard"
              element={
                <DashboardView />
              }
            />

            {/* =================================================
                SETTINGS
            ================================================= */}

            <Route
              path="settings"
              element={
                <SettingsView />
              }
            />

            {/* =================================================
                FALLBACK
            ================================================= */}

            <Route
              path="*"
              element={
                <HomeView />
              }
            />

          </Routes>

        </main>
      </div>

      {/* =================================================
          PROCESSING SCREEN
      ================================================= */}

      {processing?.active && (
        <ProcessingScreen
          steps={
            processing.steps
          }
          label={
            processing.label
          }
        />
      )}

    </div>
  )
}