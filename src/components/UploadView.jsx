import React, { useState } from 'react';
import { uploadAndParseWorkbook } from '../services/workbookService';

export default function UploadView({ onUploadSuccess }) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const processFile = async (file) => {
    if (!file) return;

    // File validation
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setErrorMsg('Please upload a valid Excel (.xlsx, .xls) or CSV file.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const result = await uploadAndParseWorkbook(file);

    setLoading(false);

    if (result.success) {
      if (onUploadSuccess) {
        onUploadSuccess(result.workbookId);
      } else {
        alert('Workbook uploaded and parsed successfully!');
      }
    } else {
      setErrorMsg(result.error || 'Failed to upload and parse workbook.');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    processFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

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
          accept=".xlsx, .xls, .csv"
          onChange={handleFileChange}
          className="hidden"
          disabled={loading}
        />

        <label htmlFor="fileInput" className="cursor-pointer flex flex-col items-center w-full">
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-300 font-medium">Uploading and parsing spreadsheet...</p>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-emerald-400 text-2xl">
                📊
              </div>
              <h3 className="text-lg font-semibold text-slate-100 mb-1">
                Upload your workbook
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                Drag and drop your Excel (.xlsx, .xls) or CSV file here, or click to browse
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
  );
}