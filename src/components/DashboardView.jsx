import React, { useState } from 'react';
import WorkbooksView from './WorkbooksView';
import UploadView from './UploadView';
import DataTable from './DataTable';
import InsightsView from './InsightsView';
import ChartCard from './ChartCard';
import AskYourData from './AskYourData';
import { getWorkbookDatasets } from '../services/workbookService';

export default function DashboardView() {
  const [activeTab, setActiveTab] = useState('workbooks');
  const [previewSubTab, setPreviewSubTab] = useState('insights'); // 'insights', 'charts', 'ask', 'data'
  const [selectedWorkbookId, setSelectedWorkbookId] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSelectWorkbook = async (workbookId) => {
    setSelectedWorkbookId(workbookId);
    setLoading(true);
    setActiveTab('preview');

    const fetchedDatasets = await getWorkbookDatasets(workbookId);
    setDatasets(fetchedDatasets);
    if (fetchedDatasets.length > 0) {
      setSelectedDataset(fetchedDatasets[0]);
    }
    setLoading(false);
  };

  const handleUploadSuccess = (workbookId) => {
    handleSelectWorkbook(workbookId);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/60 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
          DataLens AI Dashboard
        </h1>

        <div className="flex gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800 text-sm">
          <button
            onClick={() => setActiveTab('workbooks')}
            className={`px-4 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'workbooks'
                ? 'bg-emerald-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Workbooks
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'upload'
                ? 'bg-emerald-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Upload File
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'workbooks' && (
          <WorkbooksView
            onSelectWorkbook={handleSelectWorkbook}
            onUploadNew={() => setActiveTab('upload')}
          />
        )}

        {activeTab === 'upload' && (
          <UploadView onUploadSuccess={handleUploadSuccess} />
        )}

        {activeTab === 'preview' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <button
                onClick={() => setActiveTab('workbooks')}
                className="text-sm text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
              >
                ← Back to Workbooks
              </button>

              <div className="flex gap-4 items-center">
                <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
                  <button
                    onClick={() => setPreviewSubTab('insights')}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      previewSubTab === 'insights'
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    💡 Insights
                  </button>
                  <button
                    onClick={() => setPreviewSubTab('charts')}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      previewSubTab === 'charts'
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    📈 Visual Charts
                  </button>
                  <button
                    onClick={() => setPreviewSubTab('ask')}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      previewSubTab === 'ask'
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🤖 Ask AI
                  </button>
                  <button
                    onClick={() => setPreviewSubTab('data')}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      previewSubTab === 'data'
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    📋 Data Table
                  </button>
                </div>

                {datasets.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {datasets.map((ds) => (
                      <button
                        key={ds.id}
                        onClick={() => setSelectedDataset(ds)}
                        className={`px-3 py-1 text-xs rounded-lg font-mono border transition-colors ${
                          selectedDataset?.id === ds.id
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold'
                            : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {ds.sheet_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : previewSubTab === 'insights' ? (
              <InsightsView dataset={selectedDataset} />
            ) : previewSubTab === 'charts' ? (
              <ChartCard dataset={selectedDataset} />
            ) : previewSubTab === 'ask' ? (
              <AskYourData dataset={selectedDataset} />
            ) : (
              <DataTable dataset={selectedDataset} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}