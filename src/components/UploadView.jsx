import React, { useState } from 'react'

import { useWorkbook } from '../context/WorkbookContext.jsx'

export default function UploadView({
  onUploadSuccess,
}) {
  const {
    uploadFile,
    encryptionReady,
  } = useWorkbook()

  const [loading, setLoading] =
    useState(false)

  const [errorMsg, setErrorMsg] =
    useState('')

  const processFile = async (
    file,
  ) => {
    if (!file) {
      return
    }

    /* =====================================================
       FILE VALIDATION
    ===================================================== */

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/csv',
    ]

    const validExtension =
      /\.(xlsx|xls|csv)$/i.test(
        file.name,
      )

    if (
      !validTypes.includes(
        file.type,
      ) &&
      !validExtension
    ) {
      setErrorMsg(
        'Please upload a valid Excel (.xlsx, .xls) or CSV file.',
      )

      return
    }

    /* =====================================================
       ENCRYPTION CHECK
    ===================================================== */

    if (!encryptionReady) {
      setErrorMsg(
        'Encryption is locked. Please login again before uploading.',
      )

      return
    }

    setLoading(true)
    setErrorMsg('')

    try {
      /*
       * IMPORTANT:
       *
       * Do NOT call uploadAndParseWorkbook()
       * directly from this component.
       *
       * WorkbookContext owns the encryption flow
       * and passes the user's encryption key
       * securely to the upload service.
       */
      const workbook =
        await uploadFile(file)

      if (!workbook) {
        setErrorMsg(
          'Could not upload the workbook. Please try again.',
        )

        return
      }

      /*
       * WorkbookContext already:
       *
       * 1. Checks authentication
       * 2. Checks encryption key
       * 3. Encrypts workbook
       * 4. Uploads encrypted data
       * 5. Saves encrypted datasets
       * 6. Decrypts the dashboard in browser
       * 7. Opens the workbook
       */

      if (
        onUploadSuccess
      ) {
        onUploadSuccess(
          workbook.id,
        )
      }
    } catch (error) {
      console.error(
        'Upload view error:',
        error,
      )

      setErrorMsg(
        error?.message ||
          'Failed to upload and analyze the workbook.',
      )
    } finally {
      setLoading(false)
    }
  }

  /* =====================================================
     FILE INPUT
  ===================================================== */

  const handleFileChange = (
    event,
  ) => {
    const file =
      event.target.files?.[0]

    processFile(file)

    /*
     * Allow selecting the same file again
     * after an error.
     */
    event.target.value = ''
  }

  /* =====================================================
     DRAG & DROP
  ===================================================== */

  const handleDrop = (
    event,
  ) => {
    event.preventDefault()

    if (loading) {
      return
    }

    const file =
      event.dataTransfer.files?.[0]

    processFile(file)
  }

  const handleDragOver = (
    event,
  ) => {
    event.preventDefault()
  }

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="flex flex-col items-center justify-center p-8 min-h-[400px]">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="w-full max-w-xl p-8 border-2 border-dashed border-slate-700 rounded-xl bg-slate-900/50 text-center flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 transition-colors"
      >
        <input
          type="file"
          id="fileInput"
          accept=".xlsx,.xls,.csv"
          onChange={
            handleFileChange
          }
          className="hidden"
          disabled={loading}
        />

        <label
          htmlFor="fileInput"
          className="cursor-pointer flex flex-col items-center w-full"
        >
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />

              <p className="text-slate-300 font-medium">
                Encrypting and
                analyzing
                spreadsheet...
              </p>

              <p className="text-xs text-slate-500">
                Your workbook is
                encrypted before
                being uploaded.
              </p>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-emerald-400 text-2xl">
                📊
              </div>

              <h3 className="text-lg font-semibold text-slate-100 mb-1">
                Upload your
                workbook
              </h3>

              <p className="text-sm text-slate-400 mb-4">
                Drag and drop your
                Excel (.xlsx, .xls)
                or CSV file here, or
                click to browse
              </p>

              <span className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-lg text-sm transition-colors">
                Browse File
              </span>
            </>
          )}
        </label>
      </div>

      {errorMsg && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg max-w-xl w-full text-center">
          {errorMsg}
        </div>
      )}
    </div>
  )
}