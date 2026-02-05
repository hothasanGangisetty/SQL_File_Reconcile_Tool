import React, { useState } from 'react';
import ConnectionPanel from './components/ConnectionPanel';
import DataIngestPanel from './components/DataIngestPanel';
import ValidationPanel from './components/ValidationPanel';
import ResultsPanel from './components/ResultsPanel';
import { LayoutDashboard } from 'lucide-react';

function App() {
  const [step, setStep] = useState(1);
  
  // State Store
  const [connectionDetails, setConnectionDetails] = useState({ server: '', database: '' });
  const [ingestData, setIngestData] = useState({ query: '', fileId: '', sqlColumns: [], fileColumns: [] });
  const [resultDetails, setResultDetails] = useState({ id: '', summary: {} });

  // Navigation Handlers
  const handleConnected = (details) => {
    setConnectionDetails(details);
    setStep(2);
  };

  const handleDataReady = (query, fileId, sqlColumns, fileColumns) => {
    setIngestData({ query, fileId, sqlColumns, fileColumns });
    setStep(3);
  };

  const handleRunComplete = (resultId, summary) => {
    setResultDetails({ id: resultId, summary });
    setStep(4);
  };

  const handleReset = () => {
    setStep(2); // Go back to data ingest, keep connection
    setResultDetails({ id: '', summary: {} });
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
      {/* Top Bar */}
      <header className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="bg-indigo-500 p-2 rounded">
                <LayoutDashboard className="w-6 h-6 text-white" />
             </div>
             <h1 className="text-xl font-bold tracking-tight">SQL Reconciliation Tool</h1>
          </div>
          <div className="flex gap-2">
             <StepBadge num={1} label="Connect" active={step === 1} done={step > 1} />
             <StepBadge num={2} label="Data" active={step === 2} done={step > 2} />
             <StepBadge num={3} label="Map" active={step === 3} done={step > 3} />
             <StepBadge num={4} label="Results" active={step === 4} done={step > 4} />
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        
        {step === 1 && (
            <div className="max-w-3xl mx-auto animate-fade-in">
                 <ConnectionPanel onConnected={handleConnected} />
            </div>
        )}

        {step === 2 && (
             <div className="animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                     <h2 className="text-2xl font-bold">Data Ingestion</h2>
                     <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded">
                         Connected to: <strong>{connectionDetails.server}</strong> / {connectionDetails.database}
                     </span>
                </div>
                <DataIngestPanel connectionDetails={connectionDetails} onDataReady={handleDataReady} />
             </div>
        )}

        {step === 3 && (
            <div className="max-w-4xl mx-auto animate-fade-in">
                <ValidationPanel ingestData={ingestData} connectionDetails={connectionDetails} onRunComplete={handleRunComplete} />
            </div>
        )}

        {step === 4 && (
             <div className="h-[calc(100vh-140px)] animate-fade-in">
                <ResultsPanel resultId={resultDetails.id} summary={resultDetails.summary} onReset={handleReset} />
             </div>
        )}

      </main>
    </div>
  );
}

const StepBadge = ({ num, label, active, done }) => (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-colors ${active ? 'bg-indigo-600 text-white' : done ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${active || done ? 'bg-white text-indigo-900 border-none' : 'border border-slate-500'}`}>
            {num}
        </div>
        <span className="hidden md:inline">{label}</span>
    </div>
);

export default App;