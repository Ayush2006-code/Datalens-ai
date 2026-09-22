import { supabase } from './supabaseClient.js'
import * as XLSX from 'xlsx'

import {
  encryptBytes,
  encryptJSON,
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

    const user = await getCurrentUser()

    if (!user) {
      throw new Error(
        'You must be logged in to upload an encrypted workbook.'
      )
    }

    const timestamp = Date.now()

    /*
     * IMPORTANT:
     *
     * Do NOT use the original filename in the
     * Storage path.
     *
     * Storage path contains only random-looking
     * identifiers so the original filename is
     * not exposed through the path.
     */
    const storageFileName =
      `${crypto.randomUUID()}.bin`

    const filePath =
      `${user.id}/${storageFileName}`

    // --------------------------------------------------
    // 1. Read workbook locally
    // --------------------------------------------------

    const arrayBuffer =
      await file.arrayBuffer()

    // --------------------------------------------------
    // 2. Parse workbook locally
    // --------------------------------------------------

    const workbookData = XLSX.read(
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
        workbookData.Sheets[sheetName]

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
          (header, index) => {
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
          .map((row) => {
            const rowObject = {}

            headers.forEach(
              (header, index) => {
                rowObject[header] =
                  row[index] !==
                  undefined
                    ? row[index]
                    : null
              }
            )

            return rowObject
          })

      parsedDatasets.push({
        sheet_name: sheetName,
        headers,
        rows,
        row_count: rows.length,
      })
    }

    if (
      parsedDatasets.length === 0
    ) {
      throw new Error(
        'The selected workbook does not contain any readable data.'
      )
    }

    // --------------------------------------------------
    // 3. Encrypt original workbook
    // --------------------------------------------------

    /*
     * The original XLSX bytes are encrypted
     * BEFORE they leave the browser.
     */
    const encryptedWorkbook =
      await encryptBytes(
        new Uint8Array(arrayBuffer),
        encryptionKey
      )

    /*
     * Convert encrypted payload to Blob.
     *
     * Storage receives only encrypted bytes.
     */
    const encryptedWorkbookBytes =
      new TextEncoder().encode(
        JSON.stringify(
          encryptedWorkbook
        )
      )

    const encryptedWorkbookBlob =
      new Blob(
        [encryptedWorkbookBytes],
        {
          type:
            'application/octet-stream',
        }
      )

    // --------------------------------------------------
    // 4. Encrypt parsed datasets
    // --------------------------------------------------

    /*
     * Every sheet's complete data is encrypted.
     *
     * Supabase will NOT receive:
     * - sheet names
     * - headers
     * - rows
     * - actual dataset values
     */
    const encryptedDatasets =
      await Promise.all(
        parsedDatasets.map(
          async (dataset) => {
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

    // --------------------------------------------------
    // 5. Upload encrypted workbook
    // --------------------------------------------------

    const {
      error: storageError,
    } = await supabase.storage
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

    // --------------------------------------------------
    // 6. Create workbook database record
    // --------------------------------------------------

    /*
     * IMPORTANT:
     *
     * We do not store the original filename.
     *
     * `name` is encrypted.
     *
     * `file_path` is random-looking.
     *
     * file_size is only the encrypted object's
     * approximate size metadata.
     */
    const encryptedName =
      await encryptJSON(
        {
          name: file.name,
          type:
            file.type ||
            'application/octet-stream',
          originalSize:
            file.size,
        },
        encryptionKey
      )

    const {
      data: workbookRecord,
      error: workbookError,
    } = await supabase
      .from('workbooks')
      .insert({
        user_id: user.id,

        /*
         * Encrypted filename metadata.
         */
        name:
          JSON.stringify(
            encryptedName
          ),

        file_path:
          filePath,

        file_size:
          encryptedWorkbookBlob.size,
      })
      .select('id')
      .single()

    if (workbookError) {
      /*
       * Roll back encrypted Storage object.
       */
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

    // --------------------------------------------------
    // 7. Save encrypted datasets
    // --------------------------------------------------

    const datasetRows =
      encryptedDatasets.map(
        (dataset) => ({
          workbook_id:
            workbookId,

          /*
           * These fields cannot remain plaintext
           * if we want to avoid dataset metadata leaks.
           *
           * Existing DB schema expects sheet_name,
           * headers, rows and row_count.
           *
           * We therefore store neutral values here
           * and put the real values inside
           * encrypted_payload.
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

    /*
     * NOTE:
     *
     * This requires an `encrypted_payload` JSONB
     * column in public.datasets.
     */
    const {
      data: savedDatasets,
      error: datasetError,
    } = await supabase
      .from('datasets')
      .insert(
        datasetRows
      )
      .select('*')

    if (datasetError) {
      /*
       * Roll back workbook record.
       */
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

      /*
       * Roll back encrypted Storage object.
       */
      await supabase.storage
        .from('workbooks')
        .remove([
          filePath,
        ])

      throw new Error(
        `Encrypted dataset save failed: ${datasetError.message}`
      )
    }

    // --------------------------------------------------
    // 8. Return browser-readable data
    // --------------------------------------------------

    /*
     * The browser already has plaintext parsed data.
     *
     * We return it locally so the dashboard can
     * immediately render without downloading and
     * decrypting again.
     */
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

      /*
       * Return original filename only
       * to the current browser session.
       */
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
  async () => {
    try {
      const user =
        await getCurrentUser()

      if (!user) {
        return []
      }

      const {
        data,
        error,
      } = await supabase
        .from('workbooks')
        .select('*')
        .eq(
          'user_id',
          user.id
        )
        .order(
          'created_at',
          {
            ascending: false,
          }
        )

      if (error) {
        throw error
      }

      return data || []
    } catch (error) {
      console.error(
        'Error fetching workbooks:',
        error
      )

      return []
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
      } = await supabase
        .from('datasets')
        .select('*')
        .eq(
          'workbook_id',
          workbookId
        )

      if (error) {
        throw error
      }

      return data || []
    } catch (error) {
      console.error(
        'Error fetching workbook datasets:',
        error
      )

      return []
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

      // ----------------------------------------------
      // 1. Get workbook
      // ----------------------------------------------

      const {
        data: workbook,
        error: fetchError,
      } = await supabase
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

      // ----------------------------------------------
      // 2. Delete datasets
      // ----------------------------------------------

      const {
        error:
          datasetDeleteError,
      } = await supabase
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

      // ----------------------------------------------
      // 3. Delete workbook record
      // ----------------------------------------------

      const {
        error:
          workbookDeleteError,
      } = await supabase
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

      // ----------------------------------------------
      // 4. Delete encrypted Storage object
      // ----------------------------------------------

      if (
        workbook.file_path
      ) {
        const {
          error:
            storageDeleteError,
        } = await supabase.storage
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