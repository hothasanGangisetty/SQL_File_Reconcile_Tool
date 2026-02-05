import React, { useState } from 'react';
import axios from 'axios';
import { ArrowLeftRight, ArrowRight, Check, AlertTriangle, Key } from 'lucide-react';

const ValidationPanel = ({ ingestData, connectionDetails, onRunComplete }) => {
    const { sqlColumns, fileColumns, query, fileId } = ingestData;

    // Mapping state: { sqlCol: fileCol }
    const [mapping, setMapping] = useState(() => {
        const initial = {};
        sqlColumns.forEach(sqlCol => {
            const exactMatch = fileColumns.find(fc => fc.toLowerCase() === sqlCol.toLowerCase());
            initial[sqlCol] = exactMatch || '';
        });
        return initial;
    });

    const [selectedKeys, setSelectedKeys] = useState([]);
    const [running, setRunning] = useState(false);
    const [error, setError] = useState(null);

    const handleMappingChange = (sqlCol, fileCol) => {
        setMapping(prev => ({ ...prev, [sqlCol]: fileCol }));
        if (!fileCol && selectedKeys.includes(sqlCol)) {
            setSelectedKeys(selectedKeys.filter(k => k !== sqlCol));
        }
    };

    const toggleKey = (sqlCol) => {
        if (!mapping[sqlCol]) return;
        if (selectedKeys.includes(sqlCol)) {
            setSelectedKeys(selectedKeys.filter(k => k !== sqlCol));
        } else {
            setSelectedKeys([...selectedKeys, sqlCol]);
        }
    };

    const mappedPairs = Object.entries(mapping).filter(([, fileCol]) => fileCol !== '');
    const unmappedCount = sqlColumns.length - mappedPairs.length;
    const canRun = mappedPairs.length > 0;
    const usedFileColumns = Object.values(mapping).filter(v => v !== '');

    const handleRun = async () => {
        setRunning(true);
        setError(null);

        try {
            const column_mapping = mappedPairs.map(([sqlCol, fileCol]) => ({
                sql: sqlCol,
                file: fileCol
            }));

            const payload = {
                file_id: fileId,
                server: connectionDetails.server,
                database: connectionDetails.database,
                query: query,
                column_mapping: column_mapping,
                keys: selectedKeys
            };

            const res = await axios.post('http://127.0.0.1:5000/api/run_comparison', payload);
            onRunComplete(res.data.result_id, res.data.summary);

        } catch (err) {
            setError("Comparison Failed: " + (err.response?.data?.message || err.message));
        } finally {
            setRunning(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-700">
                <ArrowLeftRight className="w-6 h-6" />
                Column Mapping &amp; Key Selection
            </h2>

            <div className="mb-6 p-4 bg-indigo-50 rounded border border-indigo-100 text-sm text-indigo-900">
                <h4 className="font-bold flex items-center gap-2">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full"></div> How it works
                </h4>
                <p className="mt-1">
                    <strong>Step 1:</strong> Map each SQL column to its matching File column using the dropdowns. Unmapped columns are ignored.<br />
                    <strong>Step 2:</strong> Mark mapped columns as <strong>Primary Key</strong> (🔑) for key-based matching. No keys = sequential row-by-row comparison.
                </p>
            </div>

            <div className="mb-6 border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                        <tr>
                            <th className="px-4 py-3 text-left font-bold text-slate-600 w-12">🔑 Key</th>
                            <th className="px-4 py-3 text-left font-bold text-blue-700">SQL Column (Source)</th>
                            <th className="px-4 py-3 text-center w-12"><ArrowRight className="w-4 h-4 mx-auto text-gray-400" /></th>
                            <th className="px-4 py-3 text-left font-bold text-emerald-700">File Column (Target)</th>
                            <th className="px-4 py-3 text-center w-20 font-bold text-slate-600">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {sqlColumns.map((sqlCol) => {
                            const isMapped = mapping[sqlCol] && mapping[sqlCol] !== '';
                            const isKey = selectedKeys.includes(sqlCol);
                            return (
                                <tr key={sqlCol} className={`${isMapped ? 'bg-white' : 'bg-amber-50'} hover:bg-slate-50 transition-colors`}>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={() => toggleKey(sqlCol)}
                                            disabled={!isMapped}
                                            className={`w-7 h-7 rounded border-2 flex items-center justify-center transition-all
                                                ${isKey ? 'bg-amber-400 border-amber-500 text-white shadow-md' : isMapped ? 'border-gray-300 hover:border-amber-400 text-transparent hover:text-amber-300' : 'border-gray-200 text-transparent cursor-not-allowed'}`}
                                            title={isMapped ? 'Toggle as Primary Key' : 'Map this column first'}
                                        >
                                            <Key className="w-4 h-4" />
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 font-mono font-bold text-blue-800">{sqlCol}</td>
                                    <td className="px-4 py-3 text-center">
                                        <ArrowRight className={`w-4 h-4 mx-auto ${isMapped ? 'text-green-500' : 'text-gray-300'}`} />
                                    </td>
                                    <td className="px-4 py-3">
                                        <select
                                            value={mapping[sqlCol] || ''}
                                            onChange={(e) => handleMappingChange(sqlCol, e.target.value)}
                                            className={`w-full p-2 border rounded-md text-sm font-mono ${isMapped ? 'border-green-300 bg-green-50 text-green-800' : 'border-amber-300 bg-white text-gray-600'}`}
                                        >
                                            <option value="">-- Not Mapped --</option>
                                            {fileColumns.map(fc => (
                                                <option key={fc} value={fc} disabled={usedFileColumns.includes(fc) && mapping[sqlCol] !== fc}>
                                                    {fc} {usedFileColumns.includes(fc) && mapping[sqlCol] !== fc ? '(used)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {isMapped ? (
                                            <span className="inline-flex items-center gap-1 text-green-600 text-xs font-bold"><Check className="w-4 h-4" /> Mapped</span>
                                        ) : (
                                            <span className="text-amber-500 text-xs font-bold">Skipped</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-wrap gap-4 mb-6 text-sm">
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded">
                    <Check className="w-4 h-4 text-green-600" />
                    <span><strong>{mappedPairs.length}</strong> columns mapped</span>
                </div>
                {unmappedCount > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span><strong>{unmappedCount}</strong> columns unmapped (ignored)</span>
                    </div>
                )}
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded">
                    <Key className="w-4 h-4 text-amber-500" />
                    <span><strong>{selectedKeys.length}</strong> key{selectedKeys.length !== 1 ? 's' : ''} selected</span>
                </div>
            </div>

            {selectedKeys.length === 0 && (
                <div className="flex items-center gap-2 mb-6 text-amber-600 bg-amber-50 p-3 rounded border border-amber-200 text-sm">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span><strong>Sequential Comparison Active</strong> — No keys selected. Rows compared by position (Row 1 vs Row 1). Ensure datasets are sorted identically.</span>
                </div>
            )}

            {error && (
                <div className="p-3 mb-4 bg-red-100 text-red-700 rounded border border-red-200 text-sm">{error}</div>
            )}

            <div className="flex justify-end">
                <button
                    onClick={handleRun}
                    disabled={running || !canRun}
                    className={`px-8 py-3 rounded-md font-bold text-lg shadow-lg flex items-center gap-2 transition-colors
                        ${canRun && !running ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                >
                    {running ? 'Processing...' : `Run Comparison (${mappedPairs.length} columns)`}
                </button>
            </div>
        </div>
    );
};

export default ValidationPanel;