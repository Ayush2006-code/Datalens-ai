import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { useAuth } from './AuthContext.jsx'
import { useToast } from './ToastContext.jsx'

import {
  getUserWorkbooks,
  getWorkbookDatasets,
  uploadAndParseWorkbook,
} from '../services/workbookService.js'

import { decryptJSON } from '../services/crypto.js'

import {
  parseSpreadsheetFile,
  SpreadsheetError,
} from '../services/spreadsheetParser.js'

import { profileSheet } from '../services/dataProfiler.js'
import { buildDemoWorkbook } from '../services/demoData.js'
import { emptyFilters } from '../services/filterEngine.js'

const WorkbookContext = createContext(null)

const PROCESSING_STEPS = [
  'Reading workbook',
  'Detecting sheets',
  'Profiling columns',
  'Checking data quality',
  'Calculating metrics',
  'Generating KPIs',
  'Building visualizations',
  'Finding insights',
]

function buildSheetsFromDatasets(datasets) {
  const sheets = {}

  for (const dataset of datasets || []) {
    const headers = Array.isArray(dataset.headers)
      ? dataset.headers
      : []

    const rows = Array.isArray(dataset.rows)
      ? dataset.rows
      : []

    if (!dataset.sheet_name) {
      continue
    }

    sheets[dataset.sheet_name] = {
      columns: headers,
      rows,
    }
  }

  return sheets
}

function buildWorkbookFromSupabase(
  workbook,
  datasets,
) {
  const sheets =
    buildSheetsFromDatasets(
      datasets,
    )

  return {
    id: workbook.id,
    ownerId: workbook.user_id,
    name: workbook.name,
    filePath: workbook.file_path,
    fileSize: workbook.file_size,
    createdAt: workbook.created_at,
    updatedAt: workbook.created_at,
    sourceType: 'upload',
    sheets,
    sheetOrder: Object.keys(sheets),
    datasets,
    dashboardConfig: {},
    versions: [
      {
        version: 1,
        savedAt: workbook.created_at,
        note: 'Uploaded workbook',
      },
    ],
  }
}

function buildWorkbookFromParsed(
  parsed,
  id = null,
) {
  const sheets =
    buildSheetsFromParsed(parsed)

  return {
    id:
      id ||
      `local_${Date.now()}`,

    ownerId: 'local',

    name:
      parsed.fileName.replace(
        /\.(xlsx|xls|csv|ods)$/i,
        '',
      ),

    createdAt:
      new Date().toISOString(),

    updatedAt:
      new Date().toISOString(),

    sourceType: 'demo',

    sheets,

    sheetOrder:
      Object.keys(sheets),

    dashboardConfig: {},

    versions: [
      {
        version: 1,
        savedAt:
          new Date().toISOString(),
        note: 'Demo workbook',
      },
    ],
  }
}

function buildSheetsFromParsed(parsed) {
  const sheets = {}

  for (
    const [name, sheet] of Object.entries(
      parsed.sheets || {},
    )
  ) {
    sheets[name] = {
      columns: sheet.columns,
      rows: sheet.rows,
    }
  }

  return sheets
}

/* =========================================================
   DECRYPT DATASETS
========================================================= */

async function decryptSupabaseDatasets(
  datasets,
  encryptionKey,
) {
  if (!encryptionKey) {
    throw new Error(
      'Encryption key is not available. Please login again.',
    )
  }

  const decryptedDatasets =
    await Promise.all(
      (datasets || []).map(
        async (dataset) => {
          /*
           * New encrypted dataset.
           */
          if (
            dataset.encrypted_payload
          ) {
            const payload =
              await decryptJSON(
                dataset.encrypted_payload,
                encryptionKey,
              )

            return {
              ...dataset,

              sheet_name:
                payload.sheet_name,

              headers:
                payload.headers,

              rows:
                payload.rows,

              row_count:
                payload.row_count,
            }
          }

          /*
           * Old plaintext dataset.
           *
           * This fallback is intentionally kept so
           * existing test records don't crash the app.
           *
           * IMPORTANT:
           * Old records are NOT encrypted.
           */
          return dataset
        },
      ),
    )

  return decryptedDatasets
}

/* =========================================================
   PROVIDER
========================================================= */

export function WorkbookProvider({
  children,
}) {
  const {
    session,
    encryptionKey,
    encryptionReady,
  } = useAuth()

  const { notify } =
    useToast()

  const [
    workbooks,
    setWorkbooks,
  ] = useState([])

  const [
    activeWorkbookId,
    setActiveWorkbookId,
  ] = useState(null)

  const [
    activeSheetName,
    setActiveSheetName,
  ] = useState(null)

  const [
    filtersBySheet,
    setFiltersBySheet,
  ] = useState({})

  const [
    processing,
    setProcessing,
  ] = useState({
    active: false,
    steps: [],
    label: '',
  })

  const ownerId =
    session?.userId || null

  /* =====================================================
     REFRESH WORKBOOKS
  ===================================================== */

  const refreshWorkbooks =
    useCallback(
      async () => {
        if (!ownerId) {
          setWorkbooks([])
          return []
        }

        try {
          const data =
            await getUserWorkbooks()

          const normalized =
            (data || []).map(
              (wb) => ({
                ...wb,

                ownerId:
                  wb.user_id,

                createdAt:
                  wb.created_at,

                updatedAt:
                  wb.created_at,

                sourceType:
                  'upload',
              }),
            )

          setWorkbooks(
            normalized,
          )

          return normalized
        } catch (error) {
          console.error(
            'Failed to refresh workbooks:',
            error,
          )

          notify(
            error?.message ||
              'Could not load your workbooks.',
            'error',
          )

          setWorkbooks([])

          return []
        }
      },
      [
        ownerId,
        notify,
      ],
    )

  /* =====================================================
     RESET WHEN USER CHANGES
  ===================================================== */

  useEffect(() => {
    refreshWorkbooks()

    setActiveWorkbookId(null)
    setActiveSheetName(null)
    setFiltersBySheet({})
  }, [
    ownerId,
    refreshWorkbooks,
  ])

  /* =====================================================
     PROCESSING ANIMATION
  ===================================================== */

  const runProcessingAnimation =
    useCallback(
      async (label) => {
        setProcessing({
          active: true,

          label,

          steps:
            PROCESSING_STEPS.map(
              (step) => ({
                label: step,
                done: false,
              }),
            ),
        })

        for (
          let i = 0;
          i <
          PROCESSING_STEPS.length;
          i++
        ) {
          // eslint-disable-next-line no-await-in-loop
          await new Promise(
            (resolve) =>
              setTimeout(
                resolve,
                140,
              ),
          )

          setProcessing(
            (current) => ({
              ...current,

              steps:
                current.steps.map(
                  (
                    step,
                    index,
                  ) =>
                    index <= i
                      ? {
                          ...step,
                          done: true,
                        }
                      : step,
                ),
            }),
          )
        }

        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              220,
            ),
        )

        setProcessing({
          active: false,
          steps: [],
          label: '',
        })
      },
      [],
    )

  /* =====================================================
     OPEN WORKBOOK INTERNALLY
  ===================================================== */

  const openWorkbookInternal =
    useCallback(
      (workbook) => {
        setActiveWorkbookId(
          workbook.id,
        )

        setActiveSheetName(
          workbook.sheetOrder?.[0] ||
            Object.keys(
              workbook.sheets || {},
            )[0] ||
            null,
        )

        setFiltersBySheet({})
      },
      [],
    )

  /* =====================================================
     OPEN SUPABASE WORKBOOK
  ===================================================== */

  const openSupabaseWorkbook =
    useCallback(
      async (workbookId) => {
        try {
          if (!encryptionReady) {
            notify(
              'Your encrypted data is locked. Please login again to unlock it.',
              'error',
            )

            return null
          }

          if (!encryptionKey) {
            notify(
              'Encryption key is unavailable. Please login again.',
              'error',
            )

            return null
          }

          const workbook =
            (
              await getUserWorkbooks()
            ).find(
              (item) =>
                item.id ===
                workbookId,
            )

          if (!workbook) {
            notify(
              'This workbook could not be found.',
              'error',
            )

            return null
          }

          const encryptedDatasets =
            await getWorkbookDatasets(
              workbookId,
            )

          /*
           * Decrypt datasets ONLY in browser.
           */
          const datasets =
            await decryptSupabaseDatasets(
              encryptedDatasets,
              encryptionKey,
            )

          const normalizedWorkbook =
            buildWorkbookFromSupabase(
              workbook,
              datasets,
            )

          setWorkbooks(
            (current) => {
              const exists =
                current.some(
                  (item) =>
                    item.id ===
                    normalizedWorkbook.id,
                )

              if (exists) {
                return current.map(
                  (item) =>
                    item.id ===
                    normalizedWorkbook.id
                      ? normalizedWorkbook
                      : item,
                )
              }

              return [
                ...current,
                normalizedWorkbook,
              ]
            },
          )

          openWorkbookInternal(
            normalizedWorkbook,
          )

          return normalizedWorkbook
        } catch (error) {
          console.error(
            'Failed to open encrypted workbook:',
            error,
          )

          notify(
            error?.message ||
              'Could not decrypt this workbook.',
            'error',
          )

          return null
        }
      },
      [
        encryptionKey,
        encryptionReady,
        notify,
        openWorkbookInternal,
      ],
    )

  /* =====================================================
     UPLOAD FILE
  ===================================================== */

  const uploadFile =
    useCallback(
      async (file) => {
        try {
          if (!ownerId) {
            notify(
              'Please sign in before uploading a workbook.',
              'error',
            )

            return null
          }

          if (!encryptionReady) {
            notify(
              'Encryption is locked. Please login again before uploading.',
              'error',
            )

            return null
          }

          if (!encryptionKey) {
            notify(
              'Encryption key is unavailable. Please login again.',
              'error',
            )

            return null
          }

          await runProcessingAnimation(
            `Analyzing ${file.name}`,
          )

          /*
           * IMPORTANT:
           *
           * Encryption key is passed directly from
           * AuthContext to the upload service.
           *
           * The service encrypts the workbook BEFORE
           * uploading it to Supabase.
           */
          const result =
            await uploadAndParseWorkbook(
              file,
              encryptionKey,
            )

          if (!result?.success) {
            notify(
              result?.error ||
                'Failed to upload and parse workbook.',
              'error',
            )

            return null
          }

          const workbookId =
            result.workbookId

          await refreshWorkbooks()

          /*
           * Open using decrypted dataset.
           */
          const workbook =
            await openSupabaseWorkbook(
              workbookId,
            )

          if (!workbook) {
            return null
          }

          notify(
            'Encrypted dashboard ready.',
            'success',
          )

          return workbook
        } catch (error) {
          console.error(
            'Upload error:',
            error,
          )

          const message =
            error instanceof
            SpreadsheetError
              ? error.message
              : error?.message ||
                "We couldn't analyze this workbook. Please check the file and try again."

          notify(
            message,
            'error',
          )

          return null
        }
      },
      [
        ownerId,
        encryptionKey,
        encryptionReady,
        notify,
        openSupabaseWorkbook,
        refreshWorkbooks,
        runProcessingAnimation,
      ],
    )

  /* =====================================================
     DEMO WORKBOOK
  ===================================================== */

  const loadDemoWorkbook =
    useCallback(
      async () => {
        const parsed =
          buildDemoWorkbook()

        const workbook =
          buildWorkbookFromParsed(
            parsed,
          )

        setWorkbooks(
          (current) => [
            ...current.filter(
              (item) =>
                item.id !==
                workbook.id,
            ),
            workbook,
          ],
        )

        openWorkbookInternal(
          workbook,
        )

        notify(
          'Demo dashboard ready.',
          'success',
        )

        return workbook
      },
      [
        notify,
        openWorkbookInternal,
      ],
    )

  /* =====================================================
     OPEN WORKBOOK
  ===================================================== */

  const openWorkbook =
    useCallback(
      async (id) => {
        return openSupabaseWorkbook(
          id,
        )
      },
      [openSupabaseWorkbook],
    )

  /* =====================================================
     CLOSE WORKBOOK
  ===================================================== */

  const closeWorkbook =
    useCallback(() => {
      setActiveWorkbookId(null)
      setActiveSheetName(null)
      setFiltersBySheet({})
    }, [])

  /* =====================================================
     DELETE WORKBOOK
  ===================================================== */

  const deleteWorkbookById =
    useCallback(
      async (id) => {
        notify(
          'Workbook deletion is currently managed from the Supabase workbook service.',
          'info',
        )

        await refreshWorkbooks()
      },
      [
        notify,
        refreshWorkbooks,
      ],
    )

  /* =====================================================
     FAVORITE
  ===================================================== */

  const toggleFavorite =
    useCallback(() => {
      notify(
        'Favorites will be connected to Supabase in the next step.',
        'info',
      )
    }, [notify])

  /* =====================================================
     RENAME
  ===================================================== */

  const renameWorkbookById =
    useCallback(() => {
      notify(
        'Workbook rename will be connected to Supabase in the next step.',
        'info',
      )
    }, [notify])

  /* =====================================================
     UPDATE WORKBOOK
  ===================================================== */

  const updateWorkbookWithFile =
    useCallback(
      async (
        id,
        file,
      ) => {
        const existing =
          workbooks.find(
            (workbook) =>
              workbook.id ===
              id,
          )

        if (!existing) {
          notify(
            'This workbook could not be found.',
            'error',
          )

          return null
        }

        try {
          await runProcessingAnimation(
            `Updating ${existing.name}`,
          )

          const parsed =
            await parseSpreadsheetFile(
              file,
            )

          const newSheets =
            buildSheetsFromParsed(
              parsed,
            )

          const updated = {
            ...existing,

            name:
              parsed.fileName.replace(
                /\.(xlsx|xls|csv|ods)$/i,
                '',
              ),

            sheets:
              newSheets,

            sheetOrder:
              Object.keys(
                newSheets,
              ),

            updatedAt:
              new Date().toISOString(),

            versions: [
              ...(existing.versions ||
                []),

              {
                version:
                  (existing.versions
                    ?.length ||
                    0) + 1,

                savedAt:
                  new Date().toISOString(),

                note:
                  'Workbook updated',
              },
            ],
          }

          setWorkbooks(
            (current) =>
              current.map(
                (workbook) =>
                  workbook.id === id
                    ? updated
                    : workbook,
              ),
          )

          openWorkbookInternal(
            updated,
          )

          notify(
            'Workbook updated successfully.',
            'success',
          )

          return {
            updated,

            summaryLines: [
              'Workbook data updated',
            ],
          }
        } catch (error) {
          console.error(
            'Workbook update error:',
            error,
          )

          const message =
            error instanceof
            SpreadsheetError
              ? error.message
              : "We couldn't process the new file."

          notify(
            message,
            'error',
          )

          return null
        }
      },
      [
        notify,
        openWorkbookInternal,
        runProcessingAnimation,
        workbooks,
      ],
    )

  /* =====================================================
     SHEET
  ===================================================== */

  const setActiveSheet =
    useCallback(
      (name) => {
        setActiveSheetName(
          name,
        )
      },
      [],
    )

  /* =====================================================
     FILTERS
  ===================================================== */

  const getFiltersForSheet =
    useCallback(
      (sheetName) =>
        filtersBySheet[
          sheetName
        ] ||
        emptyFilters(),
      [filtersBySheet],
    )

  const updateFiltersForSheet =
    useCallback(
      (
        sheetName,
        updates,
      ) => {
        setFiltersBySheet(
          (previous) => ({
            ...previous,

            [sheetName]: {
              ...(previous[
                sheetName
              ] ||
                emptyFilters()),

              ...updates,
            },
          }),
        )
      },
      [],
    )

  const clearFiltersForSheet =
    useCallback(
      (sheetName) => {
        setFiltersBySheet(
          (previous) => ({
            ...previous,

            [sheetName]:
              emptyFilters(),
          }),
        )
      },
      [],
    )

  /* =====================================================
     CHART VISIBILITY
  ===================================================== */

  const toggleChartVisibility =
    useCallback(
      (chartId) => {
        if (!activeWorkbookId) {
          return
        }

        setWorkbooks(
          (current) =>
            current.map(
              (workbook) => {
                if (
                  workbook.id !==
                  activeWorkbookId
                ) {
                  return workbook
                }

                const hidden =
                  new Set(
                    workbook
                      .dashboardConfig
                      ?.hiddenCharts ||
                      [],
                  )

                if (
                  hidden.has(
                    chartId,
                  )
                ) {
                  hidden.delete(
                    chartId,
                  )
                } else {
                  hidden.add(
                    chartId,
                  )
                }

                return {
                  ...workbook,

                  dashboardConfig:
                    {
                      ...workbook.dashboardConfig,

                      hiddenCharts:
                        [
                          ...hidden,
                        ],
                    },
                }
              },
            ),
        )
      },
      [activeWorkbookId],
    )

  /* =====================================================
     RESET DASHBOARD
  ===================================================== */

  const resetDashboardConfig =
    useCallback(() => {
      if (!activeWorkbookId) {
        return
      }

      setWorkbooks(
        (current) =>
          current.map(
            (workbook) =>
              workbook.id ===
              activeWorkbookId
                ? {
                    ...workbook,

                    dashboardConfig:
                      {},
                  }
                : workbook,
          ),
      )

      notify(
        'Dashboard reset to the auto-generated layout.',
        'success',
      )
    }, [
      activeWorkbookId,
      notify,
    ])

  /* =====================================================
     ACTIVE WORKBOOK
  ===================================================== */

  const activeWorkbook =
    useMemo(
      () =>
        workbooks.find(
          (workbook) =>
            workbook.id ===
            activeWorkbookId,
        ) || null,
      [
        workbooks,
        activeWorkbookId,
      ],
    )

  /* =====================================================
     ACTIVE SHEET
  ===================================================== */

  const activeSheet =
    useMemo(() => {
      if (
        !activeWorkbook ||
        !activeSheetName
      ) {
        return null
      }

      return (
        activeWorkbook.sheets?.[
          activeSheetName
        ] || null
      )
    }, [
      activeWorkbook,
      activeSheetName,
    ])

  /* =====================================================
     PROFILE
  ===================================================== */

  const activeSheetProfile =
    useMemo(() => {
      if (!activeSheet) {
        return null
      }

      return profileSheet(
        activeSheet,
      )
    }, [activeSheet])

  /* =====================================================
     CONTEXT VALUE
  ===================================================== */

  const value = useMemo(
    () => ({
      workbooks,

      activeWorkbook,

      activeSheetName,

      activeSheet,

      activeSheetProfile,

      processing,

      filters:
        activeSheetName
          ? getFiltersForSheet(
              activeSheetName,
            )
          : emptyFilters(),

      uploadFile,

      loadDemoWorkbook,

      openWorkbook,

      closeWorkbook,

      deleteWorkbookById,

      toggleFavorite,

      renameWorkbookById,

      updateWorkbookWithFile,

      setActiveSheet,

      updateFiltersForSheet,

      clearFiltersForSheet,

      toggleChartVisibility,

      resetDashboardConfig,

      refreshWorkbooks,

      /*
       * Expose encryption status so UI can
       * later show Locked / Unlocked state.
       */
      encryptionReady,
    }),
    [
      workbooks,
      activeWorkbook,
      activeSheetName,
      activeSheet,
      activeSheetProfile,
      processing,
      getFiltersForSheet,
      uploadFile,
      loadDemoWorkbook,
      openWorkbook,
      closeWorkbook,
      deleteWorkbookById,
      toggleFavorite,
      renameWorkbookById,
      updateWorkbookWithFile,
      setActiveSheet,
      updateFiltersForSheet,
      clearFiltersForSheet,
      toggleChartVisibility,
      resetDashboardConfig,
      refreshWorkbooks,
      encryptionReady,
    ],
  )

  return (
    <WorkbookContext.Provider
      value={value}
    >
      {children}
    </WorkbookContext.Provider>
  )
}

export function useWorkbook() {
  const context =
    useContext(
      WorkbookContext,
    )

  if (!context) {
    throw new Error(
      'useWorkbook must be used within WorkbookProvider',
    )
  }

  return context
}