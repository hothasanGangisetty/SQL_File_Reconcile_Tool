import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useConsole } from '../context/ConsoleContext';
import {
    Play, Download, RotateCcw, ChevronDown, ChevronUp,
    AlertTriangle, MinusCircle, PlusCircle, CheckCircle2
} from 'lucide-react';

const RunComparisonTab = ({ connection, sqlState, fileState, mappingState, onReset }) => {
    const { log, logTable } = useConsole();

    const [resultId, setResultId] = useState(null);
    const [summary, setSummary] = useState(null);
    const [allData, setAllData] = useState([]);
    const [columns, setColumns] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingResults, setLoadingResults] = useState(false);
    const [collapsed, setCollapsed] = useState({ mismatch: false, missing: false, extra: false });

    const mappedPairs = Object.entries(mappingState.mapping).filter(([, v]) => v !== '');

    // --- Run Comparison ---
    const handleRun = async () => {
        setLoading(true);
        log('───── Running Comparison ─────', 'header');
        log(`Mapped columns: ${mappedPairs.length}`, 'info');
        log(`Key columns: ${mappingState.keys.length > 0 ? mappingState.keys.join(', ') : 'None (sequential)'}`, 'info');

        try {
            const column_mapping = mappedPairs.map(([sqlCol, fileCol]) => ({ sql: sqlCol, file: fileCol }));
            const payload = {
                file_id: fileState.fileId,
                server: connection.server,
                database: connection.database,
                query: sqlState.query,
                column_mapping,
                keys: mappingState.keys
            };

            const res = await axios.post('http://127.0.0.1:5000/api/run_comparison', payload);
            const { result_id, summary: sum } = res.data;

            setResultId(result_id);
            setSummary(sum);

            log(`Comparison complete!`, 'success');
            log(`SQL Rows: ${sum.total_sql_rows}  |  File Rows: ${sum.total_file_rows}`, 'info');
            log(`Mismatched: ${sum.mismatches}  |  Missing: ${sum.only_on_sql}  |  Extra: ${sum.only_on_file}`, sum.mismatches + sum.only_on_sql + sum.only_on_file > 0 ? 'warn' : 'success');

            if (sum.mismatches + sum.only_on_sql + sum.only_on_file === 0) {
                log('✅ No discrepancies — data matches perfectly!', 'success');
            }

        } catch (err) {
            const msg = err.response?.data?.message || err.message;
            log(`Comparison failed: ${msg}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    // --- Load full result pages ---
    useEffect(() => {
        if (!resultId) return;
        const loadAll = async () => {
            setLoadingResults(true);
            try {
                let collected = [];
                let pg = 1, hasMore = true;
                while (hasMore) {
                    const res = await axios.get(
                        `http://127.0.0.1:5000/api/results_page?result_id=${resultId}&page=${pg}&size=5000`
                    );
                    collected = [...collected, ...res.data.data];
                    hasMore = res.data.has_more;
                    pg++;
                }
                setAllData(collected);
                if (collected.length > 0) {
                    setColumns(Object.keys(collected[0]).filter(k => !['status', '_mismatch_cols'].includes(k)));
                }
                if (collected.length > 0) {
                    log(`Loaded ${collected.length} result rows for display`, 'info');
                }
            } catch (err) {
                log('Failed to load result rows', 'error');
            } finally {
                setLoadingResults(false);
            }
        };
        loadAll();
    }, [resultId]);

    // --- Categories ---
    const mismatched = allData.filter(r => r.status === 'Mismatch');
    const missing = allData.filter(r => r.status === 'Only in SQL');
    const extra = allData.filter(r => r.status === 'Only in File');

    const isMismatchCell = (row, col) => {
        if (row.status !== 'Mismatch') return false;
        return (row._mismatch_cols || '').split(',').filter(Boolean).includes(col);
    };

    // --- Export Excel (styled with colors) ---
    const handleExportExcel = () => {
        const a = document.createElement('a');
        a.href = `http://127.0.0.1:5000/api/export_excel?result_id=${resultId}`;
        a.download = '';
        a.click();
        log('Downloading styled Excel report with color formatting...', 'success');
    };

    // --- Export CSV (plain) ---
    const handleExportCsv = () => {
        if (allData.length === 0) return;
        const headers = Object.keys(allData[0]).filter(k => k !== '_mismatch_cols');
        const csvRows = [headers.join(',')];
        allData.forEach(row => {
            csvRows.push(headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','));
        });
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reconciliation_${resultId?.slice(0, 8) || 'result'}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        log(`Exported ${allData.length} rows to CSV (plain)`, 'success');
    };

    const toggle = (key) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

    // --- Render table for a category ---
    const renderTable = (rows, rowBgFn) => {
        if (rows.length === 0) return <p className="text-xs text-gray-400 italic px-3 py-2">None</p>;
        return (
            <div className="overflow-x-auto">
                <table className="min-w-full text-[11px] text-left whitespace-nowrap">
                    <thead className="bg-brand-900 text-white sticky top-0 z-10 font-bold">
                        <tr>
                            {columns.map(col => (
                                <th key={col} className={`px-2 py-1.5 border-r border-slate-600 ${col === 'pre/post' ? 'w-16' : ''}`}>
                                    {col}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => {
                            const isPreRow = row['pre/post'] === 'pre';
                            const isPairStart = isPreRow || row.status !== 'Mismatch';
                            return (
                                <tr
                                    key={idx}
                                    className={`${rowBgFn(row)} ${isPairStart && idx > 0 ? 'border-t-2 border-slate-300' : 'border-t border-gray-100'} hover:brightness-95 transition-all`}
                                >
                                    {columns.map(col => {
                                        const mismatch = isMismatchCell(row, col);
                                        const isPrePostCol = col === 'pre/post';
                                        let cellClass = 'px-2 py-1 border-r';
                                        if (isPrePostCol) {
                                            cellClass += isPreRow ? ' font-bold text-blue-700' : ' font-bold text-emerald-700';
                                        } else if (mismatch) {
                                            cellClass += ' bg-red-200 text-red-900 font-bold';
                                        }
                                        return <td key={col} className={cellClass}>{String(row[col] ?? '')}</td>;
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    // --- Section header ---
    const SectionHeader = ({ title, icon, count, color, sectionKey, badgeBg }) => (
        <button
            onClick={() => toggle(sectionKey)}
            className={`w-full flex items-center justify-between px-3 py-2 ${color} rounded-t font-bold text-xs hover:brightness-95 transition-all`}
        >
            <div className="flex items-center gap-2">
                {icon}
                <span>{title}</span>
                <span className={`${badgeBg} text-white text-[10px] px-1.5 py-0.5 rounded-full`}>{count}</span>
            </div>
            {collapsed[sectionKey] ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        </button>
    );

    // ---- PRE-RUN STATE ----
    if (!resultId) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-6 p-6">
                <div className="text-center max-w-md">
                    <Play className="w-12 h-12 text-brand-700 mx-auto mb-3" />
                    <h3 className="font-bold text-lg text-slate-700 mb-1">Ready to Compare</h3>
                    <p className="text-sm text-gray-500 mb-4">
                        {mappedPairs.length} columns mapped
                        {mappingState.keys.length > 0 ? `, ${mappingState.keys.length} key(s) selected` : ' (sequential mode)'}
                    </p>
                    <button
                        onClick={handleRun}
                        disabled={loading}
                        className="bg-brand-700 hover:bg-brand-900 disabled:bg-gray-300 text-white px-8 py-3 rounded-lg font-bold text-sm shadow-lg flex items-center gap-2 mx-auto transition-colors"
                    >
                        <Play className="w-4 h-4" />
                        {loading ? 'Processing...' : 'Run Comparison'}
                    </button>
                </div>
            </div>
        );
    }

    // ---- LOADING RESULTS ----
    if (loadingResults) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-10 h-10 border-4 border-brand-700 border-t-transparent rounded-full mx-auto mb-3" />
                    <p className="text-gray-500 text-sm font-medium">Loading results...</p>
                </div>
            </div>
        );
    }

    // ---- RESULTS VIEW ----
    return (
        <div className="p-4 space-y-3">
            {/* Summary Stats */}
            <div className="grid grid-cols-5 gap-2 text-center">
                <div className="p-2 bg-brand-100/30 rounded border border-brand-700/20">
                    <div className="text-[10px] text-brand-900 uppercase font-bold">SQL Rows</div>
                    <div className="text-lg font-bold text-brand-900">{summary.total_sql_rows}</div>
                </div>
                <div className="p-2 bg-brand-100/50 rounded border border-brand-500/20">
                    <div className="text-[10px] text-brand-700 uppercase font-bold">File Rows</div>
                    <div className="text-lg font-bold text-brand-900">{summary.total_file_rows}</div>
                </div>
                <div className="p-2 bg-orange-50 rounded border border-orange-200">
                    <div className="text-[10px] text-orange-600 uppercase font-bold">Mismatched</div>
                    <div className="text-lg font-bold text-orange-700">{summary.mismatches}</div>
                </div>
                <div className="p-2 bg-amber-50 rounded border border-amber-200">
                    <div className="text-[10px] text-amber-600 uppercase font-bold">SQL Only</div>
                    <div className="text-lg font-bold text-amber-700">{summary.only_on_sql}</div>
                </div>
                <div className="p-2 bg-red-50 rounded border border-red-200">
                    <div className="text-[10px] text-red-600 uppercase font-bold">File Only</div>
                    <div className="text-lg font-bold text-red-700">{summary.only_on_file}</div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-yellow-200 border border-yellow-400 inline-block" /> pre (SQL)</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-200 border border-green-400 inline-block" /> post (File)</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-300 border border-red-400 inline-block" /> Changed</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleExportExcel} className="px-3 py-1 bg-brand-500 text-white rounded hover:bg-brand-700 flex items-center gap-1 text-xs font-bold">
                        <Download className="w-3 h-3" /> Export Excel
                    </button>
                    <button onClick={handleExportCsv} className="px-3 py-1 bg-slate-600 text-white rounded hover:bg-slate-700 flex items-center gap-1 text-xs">
                        <Download className="w-3 h-3" /> CSV
                    </button>
                    <button onClick={onReset} className="px-3 py-1 bg-brand-700 text-white rounded hover:bg-brand-900 flex items-center gap-1 text-xs">
                        <RotateCcw className="w-3 h-3" /> New Comparison
                    </button>
                </div>
            </div>

            {/* Perfect match */}
            {allData.length === 0 && (
                <div className="bg-brand-100/30 border border-brand-500/30 rounded-lg p-8 text-center">
                    <div>
                        <CheckCircle2 className="w-10 h-10 text-brand-500 mx-auto mb-2" />
                        <p className="text-brand-900 font-bold text-sm">No discrepancies — data matches perfectly!</p>
                    </div>
                </div>
            )}

            {/* Section 1: Mismatched */}
            {mismatched.length > 0 && (
                <div className="bg-white rounded-lg shadow border border-orange-200">
                    <SectionHeader
                        title="Mismatched Rows" icon={<AlertTriangle className="w-3 h-3 text-orange-700" />}
                        count={summary.mismatches} color="bg-orange-50 text-orange-800"
                        sectionKey="mismatch" badgeBg="bg-orange-500"
                    />
                    {!collapsed.mismatch && renderTable(mismatched, row => row['pre/post'] === 'pre' ? 'bg-yellow-50' : 'bg-green-50')}
                </div>
            )}

            {/* Section 2: Missing (SQL only) */}
            {missing.length > 0 && (
                <div className="bg-white rounded-lg shadow border border-amber-200">
                    <SectionHeader
                        title="Missing from File (SQL only)" icon={<MinusCircle className="w-3 h-3 text-amber-700" />}
                        count={summary.only_on_sql} color="bg-amber-50 text-amber-800"
                        sectionKey="missing" badgeBg="bg-amber-500"
                    />
                    {!collapsed.missing && renderTable(missing, () => 'bg-amber-50')}
                </div>
            )}

            {/* Section 3: Extra (File only) */}
            {extra.length > 0 && (
                <div className="bg-white rounded-lg shadow border border-red-200">
                    <SectionHeader
                        title="Extra in File (not in SQL)" icon={<PlusCircle className="w-3 h-3 text-red-700" />}
                        count={summary.only_on_file} color="bg-red-50 text-red-800"
                        sectionKey="extra" badgeBg="bg-red-500"
                    />
                    {!collapsed.extra && renderTable(extra, () => 'bg-red-50')}
                </div>
            )}
        </div>
    );
};

export default RunComparisonTab;
