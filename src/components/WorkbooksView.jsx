import React, { useEffect, useState } from 'react';
import {
  getUserWorkbooks,
  deleteWorkbook,
} from '../services/workbookService';

export default function WorkbooksView({ onSelectWorkbook, onUploadNew }) {
  const [workbooks, setWorkbooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const loadWorkbooks = async () => {
    setLoading(true);

    try {
      const data = await getUserWorkbooks();
      setWorkbooks(data || []);
    } catch (error) {
      console.error('Failed to load workbooks:', error);
      setWorkbooks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkbooks();
  }, []);

  const handleDelete = async (event, workbookId, workbookName) => {
    event.stopPropagation();

    const confirmed = window.confirm(
      `Are you sure you want to delete "${workbookName}"?\n\nThis will permanently remove the workbook and its saved data.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(workbookId);

      const result = await deleteWorkbook(workbookId);

      if (!result?.success) {
        throw new Error(result?.error || 'Delete failed');
      }

      setWorkbooks((current) =>
        current.filter((workbook) => workbook.id !== workbookId)
      );

      alert('Workbook deleted successfully.');
    } catch (error) {
      console.error('Delete workbook error:', error);
      alert(error.message || 'Failed to delete workbook.');
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date) => {
    if (!date) return 'Unknown date';

    try {
      return new Date(date).toLocaleString();
    } catch {
      return 'Unknown date';
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Your Workbooks
          </h2>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your uploaded Excel and spreadsheet files
          </p>
        </div>

        <button
          onClick={onUploadNew}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          + Upload New
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Loading workbooks...
          </div>
        </div>
      )}

      {/* Empty */}
      {!loading && workbooks.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-3 text-5xl">📊</div>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            No workbooks yet
          </h3>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Upload your first workbook to start analyzing your data.
          </p>

          <button
            onClick={onUploadNew}
            className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Upload Workbook
          </button>
        </div>
      )}

      {/* Workbook Grid */}
      {!loading && workbooks.length > 0 && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {workbooks.map((wb) => {
            const isDeleting = deletingId === wb.id;

            return (
              <div
                key={wb.id}
                onClick={() =>
                  !isDeleting &&
                  onSelectWorkbook &&
                  onSelectWorkbook(wb.id)
                }
                className={`group relative cursor-pointer rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md dark:border-gray-700 dark:bg-gray-900 ${
                  isDeleting ? 'pointer-events-none opacity-60' : ''
                }`}
              >
                {/* Delete Button */}
                <button
                  type="button"
                  onClick={(event) =>
                    handleDelete(event, wb.id, wb.name)
                  }
                  disabled={isDeleting}
                  title="Delete workbook"
                  className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-950"
                >
                  {isDeleting ? '⏳' : '🗑️'}
                </button>

                {/* File Icon */}
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-2xl dark:bg-blue-950">
                  📊
                </div>

                {/* Workbook Name */}
                <h3 className="truncate pr-10 text-base font-semibold text-gray-900 dark:text-white">
                  {wb.name}
                </h3>

                {/* File Info */}
                <div className="mt-3 space-y-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Size: {formatFileSize(wb.file_size)}
                  </p>

                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Uploaded: {formatDate(wb.created_at)}
                  </p>
                </div>

                {/* Open label */}
                <div className="mt-4 text-sm font-medium text-blue-600 dark:text-blue-400">
                  Open workbook →
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}