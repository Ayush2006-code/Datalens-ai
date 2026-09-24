import {
  useEffect,
  useRef,
  useState,
} from 'react'

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

import {
  useWorkbook,
} from '../context/WorkbookContext.jsx'

export default function Workspace() {
  const {
    processing,
    loadDemoWorkbook,
    openWorkbook,
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

  const navigate =
    useNavigate()

  const demoRequestedRef =
    useRef(false)

  const [
    openingWorkbook,
    setOpeningWorkbook,
  ] = useState(false)

  /* =====================================================
     DEMO
  ===================================================== */

  useEffect(() => {
    if (
      searchParams.get('demo') === '1' &&
      !demoRequestedRef.current
    ) {
      demoRequestedRef.current =
        true

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
     
     IMPORTANT:
     Load workbook FIRST.
     Navigate SECOND.
     
     This removes the extra dashboard/workbook
     transition that you were seeing.
  ===================================================== */

  const handleSelectWorkbook =
    async (workbookId) => {
      if (!workbookId) {
        return
      }

      try {
        setOpeningWorkbook(
          true,
        )

        const workbook =
          await openWorkbook(
            workbookId,
          )

        if (!workbook) {
          console.error(
            'Workbook could not be opened.',
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
      } catch (error) {
        console.error(
          'Failed to open workbook:',
          error,
        )
      } finally {
        setOpeningWorkbook(
          false,
        )
      }
    }

  /* =====================================================
     MOBILE MENU
  ===================================================== */

  const closeMobileMenu = () => {
    setMobileMenuOpen(
      false,
    )
  }

  /* =====================================================
     LAYOUT
  ===================================================== */

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">

      <Sidebar
        mobileOpen={
          mobileMenuOpen
        }
        onClose={
          closeMobileMenu
        }
      />

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

      {/* =====================================================
          OPENING WORKBOOK
      ===================================================== */}

      {openingWorkbook && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">

          <div className="rounded-xl border border-slate-700 bg-slate-900 px-8 py-7 text-center shadow-2xl">

            <div className="mx-auto h-9 w-9 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />

            <p className="mt-4 text-sm font-medium text-slate-200">
              Opening workbook...
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Unlocking your encrypted data
            </p>

          </div>

        </div>
      )}

      {/* =====================================================
          PROCESSING
      ===================================================== */}

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