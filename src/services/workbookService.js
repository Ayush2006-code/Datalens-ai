import { supabase } from './supabaseClient.js'
import * as XLSX from 'xlsx'

import {
  encryptBytes,
  encryptJSON,
  decryptJSON,
} from './crypto.js'

/* =========================================================
   GET CURRENT USER
========================================================= */

const getCurrentUser = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    throw error
  }

  return user
}

/* =========================================================
   UPLOAD + PARSE + ENCRYPT WORKBOOK
========================================================= */

export const uploadAndParseWorkbook = async (
  file,
  encryptionKey
) => {
  try {
    if (!file) {
      throw new Error(
        'No workbook file was selected.'
      )
    }

    if (!encryptionKey) {
      throw new Error(
        'Encryption key is not available. Please login again.'
      )
    }

    const user =
      await getCurrentUser()

    if (!user) {
      throw new Error(
        'You must be logged in to upload an encrypted workbook.'
      )
    }

    const timestamp =
      Date.now()

    /*
     * Original filename is NEVER used
     * in the Storage path.
     */
    const storageFileName =
      `${crypto.randomUUID()}.bin`

    const filePath =
      `${user.id}/${storageFileName}`

    /* =======================================================
       1. READ FILE LOCALLY
    ======================================================= */

    const arrayBuffer =
      await file.arrayBuffer()

    /* =======================================================
       2. PARSE WORKBOOK LOCALLY
    ======================================================= */

    const workbookData =
      XLSX.read(
        arrayBuffer,
        {
          type: 'array',
        }
      )

    const parsedDatasets = []

    for (
      const sheetName of
      workbookData.SheetNames
    ) {
      const sheet =
        workbookData.Sheets[
          sheetName
        ]

      const jsonData =
        XLSX.utils.sheet_to_json(
          sheet,
          {
            header: 1,
            defval: null,
          }
        )

      if (!jsonData.length) {
        continue
      }

      const headers =
        (jsonData[0] || []).map(
          (
            header,
            index
          ) => {
            const value =
              String(
                header ?? ''
              ).trim()

            return (
              value ||
              `col_${index}`
            )
          }
        )

      const rows =
        jsonData
          .slice(1)
          .map(
            (row) => {
              const rowObject =
                {}

              headers.forEach(
                (
                  header,
                  index
                ) => {
                  rowObject[
                    header
                  ] =
                    row[index] !==
                    undefined
                      ? row[index]
                      : null
                }
              )

              return rowObject
            }
          )

      parsedDatasets.push({
        sheet_name:
          sheetName,

        headers,

        rows,

        row_count:
          rows.length,
      })
    }

    if (
      parsedDatasets.length ===
      0
    ) {
      throw new Error(
        'The selected workbook does not contain any readable data.'
      )
    }

    /* =======================================================
       3. ENCRYPT ORIGINAL XLSX
    ======================================================= */

    const encryptedWorkbook =
      await encryptBytes(
        new Uint8Array(
          arrayBuffer
        ),
        encryptionKey
      )

    const encryptedWorkbookBytes =
      new TextEncoder().encode(
        JSON.stringify(
          encryptedWorkbook
        )
      )

    const encryptedWorkbookBlob =
      new Blob(
        [
          encryptedWorkbookBytes,
        ],
        {
          type:
            'application/octet-stream',
        }
      )

    /* =======================================================
       4. ENCRYPT DATASETS
    ======================================================= */

    const encryptedDatasets =
      await Promise.all(
        parsedDatasets.map(
          async (
            dataset
          ) => {
            const encryptedPayload =
              await encryptJSON(
                {
                  sheet_name:
                    dataset.sheet_name,

                  headers:
                    dataset.headers,

                  rows:
                    dataset.rows,

                  row_count:
                    dataset.row_count,
                },
                encryptionKey
              )

            return {
              encrypted_payload:
                encryptedPayload,
            }
          }
        )
      )

    /* =======================================================
       5. ENCRYPT WORKBOOK METADATA
    ======================================================= */

    const encryptedMetadata =
      await encryptJSON(
        {
          name:
            file.name,

          type:
            file.type ||
            'application/octet-stream',

          originalSize:
            file.size,
        },
        encryptionKey
      )

    /* =======================================================
       6. UPLOAD ENCRYPTED FILE
    ======================================================= */

    const {
      error:
        storageError,
    } =
      await supabase.storage
        .from('workbooks')
        .upload(
          filePath,
          encryptedWorkbookBlob,
          {
            upsert: false,

            contentType:
              'application/octet-stream',
          }
        )

    if (storageError) {
      throw new Error(
        `Encrypted storage upload failed: ${storageError.message}`
      )
    }

    /* =======================================================
       7. SAVE ENCRYPTED WORKBOOK METADATA
    ======================================================= */

    const {
      data:
        workbookRecord,
      error:
        workbookError,
    } =
      await supabase
        .from('workbooks')
        .insert({
          user_id:
            user.id,

          name:
            JSON.stringify(
              encryptedMetadata
            ),

          file_path:
            filePath,

          file_size:
            encryptedWorkbookBlob.size,
        })
        .select('id')
        .single()

    if (workbookError) {
      await supabase.storage
        .from('workbooks')
        .remove([
          filePath,
        ])

      throw new Error(
        `Workbook database save failed: ${workbookError.message}`
      )
    }

    const workbookId =
      workbookRecord.id

    /* =======================================================
       8. SAVE ENCRYPTED DATASETS
    ======================================================= */

    const datasetRows =
      encryptedDatasets.map(
        (
          dataset
        ) => ({
          workbook_id:
            workbookId,

          /*
           * No plaintext dataset information
           * is stored here.
           */
          sheet_name:
            'encrypted',

          headers: [],

          rows: [],

          row_count: 0,

          encrypted_payload:
            dataset.encrypted_payload,
        })
      )

    const {
      data:
        savedDatasets,
      error:
        datasetError,
    } =
      await supabase
        .from('datasets')
        .insert(
          datasetRows
        )
        .select('*')

    if (datasetError) {
      await supabase
        .from('workbooks')
        .delete()
        .eq(
          'id',
          workbookId
        )
        .eq(
          'user_id',
          user.id
        )

      await supabase.storage
        .from('workbooks')
        .remove([
          filePath,
        ])

      throw new Error(
        `Encrypted dataset save failed: ${datasetError.message}`
      )
    }

    /* =======================================================
       9. RETURN LOCAL DATA
    ======================================================= */

    const localDatasets =
      parsedDatasets.map(
        (
          dataset,
          index
        ) => ({
          id:
            savedDatasets?.[
              index
            ]?.id ||
            `local_${timestamp}_${index}`,

          workbook_id:
            workbookId,

          sheet_name:
            dataset.sheet_name,

          headers:
            dataset.headers,

          rows:
            dataset.rows,

          row_count:
            dataset.row_count,
        })
      )

    return {
      success: true,

      workbookId,

      name:
        file.name,

      datasets:
        localDatasets,
    }
  } catch (error) {
    console.error(
      'Error uploading and encrypting workbook:',
      error
    )

    return {
      success: false,

      error:
        error?.message ||
        'Failed to upload and encrypt workbook.',
    }
  }
}

/* =========================================================
   GET USER WORKBOOKS
========================================================= */

export const getUserWorkbooks =
  async (
    encryptionKey
  ) => {
    try {
      if (!encryptionKey) {
        throw new Error(
          'Encryption key is not available. Please login again.'
        )
      }

      const user =
        await getCurrentUser()

      if (!user) {
        return []
      }

      const {
        data,
        error,
      } =
        await supabase
          .from('workbooks')
          .select('*')
          .eq(
            'user_id',
            user.id
          )
          .order(
            'created_at',
            {
              ascending:
                false,
            }
          )

      if (error) {
        throw error
      }

      /*
       * IMPORTANT:
       *
       * Workbook metadata is decrypted ONLY
       * inside the browser.
       *
       * The encryption key is explicitly passed
       * from WorkbookContext.
       *
       * No window.__datalensEncryptionKey.
       */

      const decryptedWorkbooks =
        await Promise.all(
          (data || []).map(
            async (
              workbook
            ) => {
              try {
                if (
                  !workbook.name
                ) {
                  return workbook
                }

                /*
                 * New encrypted workbook.
                 */
                try {
                  const encryptedMetadata =
                    JSON.parse(
                      workbook.name
                    )

                  const metadata =
                    await decryptJSON(
                      encryptedMetadata,
                      encryptionKey
                    )

                  return {
                    ...workbook,

                    name:
                      metadata?.name ||
                      'Encrypted workbook',

                    file_size:
                      metadata?.originalSize ??
                      workbook.file_size,

                    original_type:
                      metadata?.type ||
                      null,
                  }
                } catch (
                  decryptError
                ) {
                  /*
                   * Old records may contain plaintext
                   * metadata. We don't silently use them
                   * as encrypted records.
                   *
                   * Keep a neutral display name until
                   * old records are cleaned.
                   */
                  console.warn(
                    'Could not decrypt workbook metadata:',
                    workbook.id,
                    decryptError
                  )

                  return {
                    ...workbook,

                    name:
                      'Encrypted workbook',

                    original_type:
                      null,
                  }
                }
              } catch (
                error
              ) {
                console.error(
                  'Failed to process workbook metadata:',
                  error
                )

                return {
                  ...workbook,

                  name:
                    'Encrypted workbook',
                }
              }
            }
          )
        )

      return decryptedWorkbooks
    } catch (error) {
      console.error(
        'Error fetching workbooks:',
        error
      )

      throw error
    }
  }

/* =========================================================
   GET ENCRYPTED DATASETS
========================================================= */

export const getWorkbookDatasets =
  async (
    workbookId
  ) => {
    try {
      if (!workbookId) {
        return []
      }

      const {
        data,
        error,
      } =
        await supabase
          .from('datasets')
          .select('*')
          .eq(
            'workbook_id',
            workbookId
          )

      if (error) {
        throw error
      }

      /*
       * Dataset payload remains encrypted.
       *
       * WorkbookContext decrypts it in browser.
       */
      return data || []
    } catch (error) {
      console.error(
        'Error fetching workbook datasets:',
        error
      )

      throw error
    }
  }

/* =========================================================
   DELETE WORKBOOK
========================================================= */

export const deleteWorkbook =
  async (
    workbookId
  ) => {
    try {
      if (!workbookId) {
        throw new Error(
          'Workbook ID is required.'
        )
      }

      const user =
        await getCurrentUser()

      if (!user) {
        throw new Error(
          'You must be logged in to delete a workbook.'
        )
      }

      /* -----------------------------------------------------
         1. GET WORKBOOK
      ----------------------------------------------------- */

      const {
        data:
          workbook,
        error:
          fetchError,
      } =
        await supabase
          .from('workbooks')
          .select(
            'id, file_path, user_id'
          )
          .eq(
            'id',
            workbookId
          )
          .eq(
            'user_id',
            user.id
          )
          .single()

      if (fetchError) {
        throw new Error(
          `Could not find workbook: ${fetchError.message}`
        )
      }

      if (!workbook) {
        throw new Error(
          'Workbook not found.'
        )
      }

      /* -----------------------------------------------------
         2. DELETE DATASETS
      ----------------------------------------------------- */

      const {
        error:
          datasetDeleteError,
      } =
        await supabase
          .from('datasets')
          .delete()
          .eq(
            'workbook_id',
            workbookId
          )

      if (
        datasetDeleteError
      ) {
        throw new Error(
          `Could not delete workbook datasets: ${datasetDeleteError.message}`
        )
      }

      /* -----------------------------------------------------
         3. DELETE WORKBOOK
      ----------------------------------------------------- */

      const {
        error:
          workbookDeleteError,
      } =
        await supabase
          .from('workbooks')
          .delete()
          .eq(
            'id',
            workbookId
          )
          .eq(
            'user_id',
            user.id
          )

      if (
        workbookDeleteError
      ) {
        throw new Error(
          `Could not delete workbook: ${workbookDeleteError.message}`
        )
      }

      /* -----------------------------------------------------
         4. DELETE STORAGE FILE
      ----------------------------------------------------- */

      if (
        workbook.file_path
      ) {
        const {
          error:
            storageDeleteError,
        } =
          await supabase.storage
            .from('workbooks')
            .remove([
              workbook.file_path,
            ])

        if (
          storageDeleteError
        ) {
          console.warn(
            'Workbook deleted from database, but encrypted storage file could not be deleted:',
            storageDeleteError
          )
        }
      }

      return {
        success: true,
      }
    } catch (error) {
      console.error(
        'Error deleting workbook:',
        error
      )

      return {
        success: false,

        error:
          error?.message ||
          'Failed to delete workbook.',
      }
    }
  }