import React, { useState } from 'react';
import axios from 'axios';
import { FileText, Database, Play, Upload } from 'lucide-react';

const DataIngestPanel = ({ connectionDetails, onDataReady }) => {
    // SQL State
    const [query, setQuery] = useState("SELECT TOP 100 * FROM ");
    const [sqlPreview, setSqlPreview] = useState({ columns: [], rows: [], count: 0 });
    const [sqlLoading, setSqlLoading] = useState(false);
    
    // File State
    const [fileId, setFileId] = useState(null);
    const [filePreview, setFilePreview] = useState({ columns: [], rows: [], count: 0 });
    const [fileLoading, setFileLoading] = useState(false);

    // Common Error
    const [error, setError] = useState(null);

    const handlePreviewSQL = async () => {
        setSqlLoading(true);
        setError(null);
        try {
            const res = await axios.post('http://127.0.0.1:5000/api/preview_sql', {
                server: connectionDetails.server,
                database: connectionDetails.database,
                query: query
            });
            setSqlPreview({
                columns: res.data.columns,
                rows: res.data.preview_data,
                count: res.data.row_count_estimate
            });
        } catch (err) {
            setError("SQL Error: " + (err.response?.data?.message || err.message));
        } finally {
            setSqlLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setFileLoading(true);
        setError(null);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await axios.post('http://127.0.0.1:5000/api/upload_file', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setFileId(res.data.file_id);
            setFilePreview({
                columns: res.data.columns,
                rows: res.data.preview_data,
                count: res.data.total_rows
            });
        } catch (err) {
            setError("Upload Error: " + (err.response?.data?.message || err.message));
        } finally {
            setFileLoading(false);
        }
    };

    const isReady = sqlPreview.rows.length > 0 && filePreview.rows.length > 0;

    const handleNext = () => {
        onDataReady(query, fileId, sqlPreview.columns, filePreview.columns);
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left: SQL Input */}
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                    <h3 className="font-bold flex items-center gap-2 mb-2 text-blue-800">
                        <Database className="w-4 h-4" /> SQL Query (Source)
                    </h3>
                    <textarea 
                        className="w-full h-32 p-2 border rounded font-mono text-sm bg-slate-50"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <div className="mt-2 flex justify-between items-center">
                        <span className="text-xs text-gray-500">{sqlPreview.count ? `~${sqlPreview.count} rows detected` : 'Ready to preview'}</span>
                        <button 
                            onClick={handlePreviewSQL}
                            disabled={sqlLoading}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 flex items-center gap-1"
                        >
                            <Play className="w-3 h-3" /> Preview
                        </button>
                    </div>
                </div>

                {/* Right: File Upload */}
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                    <h3 className="font-bold flex items-center gap-2 mb-2 text-emerald-800">
                        <FileText className="w-4 h-4" /> Local File (Target)
                    </h3>
                    <div className="h-32 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center bg-slate-50 relative">
                        <input 
                            type="file" 
                            accept=".csv, .xlsx, .xls"
                            onChange={handleFileUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-500">Click to Upload CSV/Excel</span>
                    </div>
                    <div className="mt-2 flex justify-between items-center">
                         <span className="text-xs text-gray-500">{filePreview.count ? `${filePreview.count} rows loaded` : 'No file selected'}</span>
                    </div>
                </div>
            </div>

            {/* Previews (Compact) */}
            {(sqlPreview.rows.length > 0 || filePreview.rows.length > 0) && (
                <div className="bg-white p-4 rounded shadow border border-gray-200">
                     <h4 className="font-bold text-sm text-gray-700 mb-2">Structure Preview</h4>
                     <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                            <strong>SQL Columns:</strong> {sqlPreview.columns.join(', ') || 'N/A'}
                        </div>
                        <div>
                             <strong>File Columns:</strong> {filePreview.columns.join(', ') || 'N/A'}
                        </div>
                     </div>
                </div>
            )}

            {error && (
                <div className="p-3 bg-red-100 text-red-700 rounded border border-red-200 text-sm">
                    {error}
                </div>
            )}

            <div className="flex justify-end">
                <button 
                    disabled={!isReady}
                    onClick={handleNext}
                    className={`px-6 py-2 rounded text-white font-bold ${isReady ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-300 cursor-not-allowed'}`}
                >
                    Next: Configure Mapping
                </button>
            </div>
        </div>
    );
};

export default DataIngestPanel;