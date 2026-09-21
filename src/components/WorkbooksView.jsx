import React, { useEffect, useState } from 'react';
import { getUserWorkbooks } from '../services/workbookService';

export default function WorkbooksView({ onSelectWorkbook, onUploadNew }) {
  const [workbooks, setWorkbooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkbooks();
  }, []);

  const loadWorkbooks = async () => {
    setLoading(true);
    const data = await getUserWorkbooks();
    setWorkbooks(data);
    setLoading(false);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Your Workbooks</h1>
          <p className="text-sm text-slate-400">Manage and explore your uploaded datasets</p>
        </div>
        <button
          onClick={onUploadNew}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-lg text-sm transition-colors"
        >
          + Upload New
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : workbooks.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/30">
          <p className="text-slate-400 mb-4">No workbooks uploaded yet.</p>
          <button
            onClick={onUploadNew}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-lg text-sm"
          >
            Upload your first file
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workbooks.map((wb) => (
            <div
              key={wb.id}
              onClick={() => onSelectWorkbook && onSelectWorkbook(wb.id)}
              className="p-5 bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-xl cursor-pointer transition-all hover:shadow-lg hover:shadow-emerald-500/5 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center justify-center font-bold">
                  📊
                </div>
                <span className="text-xs text-slate-500 font-mono">
                  {formatFileSize(wb.file_size)}
                </span>
              </div>
              <h3 className="font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors truncate">
                {wb.name}
              </h3>
              <p className="text-xs text-slate-500 mt-2">
                Uploaded: {new Date(wb.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}