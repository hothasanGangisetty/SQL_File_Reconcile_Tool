import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, ChevronDown, ChevronUp, AlertTriangle, MinusCircle, PlusCircle } from 'lucide-react';

const ResultsPanel = ({ resultId, summary, onReset }) => {
    const [allData, setAllData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [columns, setColumns] = useState([]);

    // Collapsed state per section
    const [collapsed, setCollapsed] = useState({ mismatch: false, missing: false, extra: false });

    const loadAll = async () => {
        setLoading(true);
        try {
            let collected = [];
            let pg = 1;
            let hasMore = true;
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
                const cols = Object.keys(collected[0]).filter(
                    k => !['status', '_mismatch_cols'].includes(k)
                );
                setColumns(cols);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadAll(); }, [resultId]);

    // Split into 3 categories
    const mismatched = allData.filter(r => r.status === 'Mismatch');
    const missing = allData.filter(r => r.status === 'Only in SQL');
    const extra = allData.filter(r => r.status === 'Only in File');

    const isMismatchCell = (row, col) => {
        if (row.status !== 'Mismatch') return false;
        const mc = (row._mismatch_cols || '').split(',').filter(Boolean);
        return mc.includes(col);
    };

    const handleExport = () => {
        if (allData.length === 0) return;
        const headers = Object.keys(allData[0]).filter(k => k !== '_mismatch_cols');
        const csvRows = [headers.join(',')];
        allData.forEach(row => {
            csvRows.push(
                headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',')
            );
        });
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reconciliation_${resultId.slice(0, 8)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const toggle = (key) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

    // --- Reusable Table Renderer ---
    const renderTable = (rows, rowBgFn) => {
        if (rows.length === 0) return <p className="text-sm text-gray-400 italic px-4 py-3">None</p>;
        return (
            <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-left whitespace-nowrap">
                    <thead className="bg-slate-700 text-white sticky top-0 z-10 font-bold">
                        <tr>
                            {columns.map(col => (
                                <th key={col} className={`px-3 py-2 border-r border-slate-600 ${col === 'pre/post' ? 'w-20' : ''}`}>
                                    {col}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => {
                            const prePost = row['pre/post'];
                            const isPreRow = prePost === 'pre';
                            const isPairStart = isPreRow || row.status !== 'Mismatch';

                            return (
                                <tr
                                    key={idx}
                                    className={`${rowBgFn(row)} ${isPairStart && idx > 0 ? 'border-t-2 border-slate-300' : 'border-t border-gray-100'} hover:brightness-95 transition-all`}
                                >
                                    {columns.map(col => {
                                        const mismatch = isMismatchCell(row, col);
                                        const isPrePostCol = col === 'pre/post';

                                        let cellClass = 'px-3 py-1.5 border-r';
                                        if (isPrePostCol) {
                                            cellClass += isPreRow
                                                ? ' font-bold text-blue-700'
                                                : ' font-bold text-emerald-700';
                                        } else if (mismatch) {
                                            cellClass += ' bg-red-200 text-red-900 font-bold';
                                        }

                                        return (
                                            <td key={col} className={cellClass}>
                                                {String(row[col] ?? '')}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    // --- Section Header ---
    const SectionHeader = ({ title, icon, count, color, sectionKey, badgeBg }) => (
        <button
            onClick={() => toggle(sectionKey)}
            className={`w-full flex items-center justify-between px-4 py-3 ${color} rounded-t-lg font-bold text-sm hover:brightness-95 transition-all`}
        >
            <div className="flex items-center gap-2">
                {icon}
                <span>{title}</span>
                <span className={`${badgeBg} text-white text-xs px-2 py-0.5 rounded-full ml-1`}>{count}</span>
            </div>
            {collapsed[sectionKey] ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                    <p className="text-gray-500 font-medium">Loading results...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary Header */}
            <div className="bg-white p-4 shadow rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
                    <div className="p-3 bg-blue-50 rounded border border-blue-100">
                        <div className="text-xs text-blue-600 uppercase font-bold">SQL Rows</div>
                        <div className="text-2xl font-bold text-blue-800">{summary.total_sql_rows}</div>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded border border-emerald-100">
                        <div className="text-xs text-emerald-600 uppercase font-bold">File Rows</div>
                        <div className="text-2xl font-bold text-emerald-800">{summary.total_file_rows}</div>
                    </div>
                    <div className="p-3 bg-orange-50 rounded border border-orange-200">
                        <div className="text-xs text-orange-600 uppercase font-bold">Mismatched</div>
                        <div className="text-2xl font-bold text-orange-700">{summary.mismatches}</div>
                    </div>
                    <div className="p-3 bg-amber-50 rounded border border-amber-200">
                        <div className="text-xs text-amber-600 uppercase font-bold">Missing (SQL only)</div>
                        <div className="text-2xl font-bold text-amber-700">{summary.only_on_sql}</div>
                    </div>
                    <div className="p-3 bg-red-50 rounded border border-red-200">
                        <div className="text-xs text-red-600 uppercase font-bold">Extra (File only)</div>
                        <div className="text-2xl font-bold text-red-700">{summary.only_on_file}</div>
                    </div>
                </div>

                <div className="flex justify-between items-center mt-4 pt-3 border-t">
                    <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded bg-yellow-200 border border-yellow-400 inline-block"></span> pre (SQL value)
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded bg-green-200 border border-green-400 inline-block"></span> post (File value)
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded bg-red-300 border border-red-400 inline-block"></span> Changed Cell
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleExport}
                            className="text-sm px-3 py-1 bg-slate-700 text-white rounded hover:bg-slate-800 flex items-center gap-1"
                        >
                            <Download className="w-3 h-3" /> Export CSV
                        </button>
                        <button
                            onClick={onReset}
                            className="text-sm px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                        >
                            New Comparison
                        </button>
                    </div>
                </div>
            </div>

            {/* No discrepancies */}
            {allData.length === 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
                    <p className="text-green-700 font-bold text-lg">✅ No discrepancies found — data matches perfectly!</p>
                </div>
            )}

            {/* Section 1: Mismatched */}
            {mismatched.length > 0 && (
                <div className="bg-white rounded-lg shadow border border-orange-200 overflow-hidden">
                    <SectionHeader
                        title="Mismatched Rows"
                        icon={<AlertTriangle className="w-4 h-4 text-orange-700" />}
                        count={summary.mismatches}
                        color="bg-orange-50 text-orange-800"
                        sectionKey="mismatch"
                        badgeBg="bg-orange-500"
                    />
                    {!collapsed.mismatch && renderTable(mismatched, (row) => {
                        return row['pre/post'] === 'pre' ? 'bg-yellow-50' : 'bg-green-50';
                    })}
                </div>
            )}

            {/* Section 2: Missing (Only in SQL) */}
            {missing.length > 0 && (
                <div className="bg-white rounded-lg shadow border border-amber-200 overflow-hidden">
                    <SectionHeader
                        title="Missing from File (Only in SQL)"
                        icon={<MinusCircle className="w-4 h-4 text-amber-700" />}
                        count={summary.only_on_sql}
                        color="bg-amber-50 text-amber-800"
                        sectionKey="missing"
                        badgeBg="bg-amber-500"
                    />
                    {!collapsed.missing && renderTable(missing, () => 'bg-amber-50')}
                </div>
            )}

            {/* Section 3: Extra (Only in File) */}
            {extra.length > 0 && (
                <div className="bg-white rounded-lg shadow border border-red-200 overflow-hidden">
                    <SectionHeader
                        title="Extra in File (Not in SQL)"
                        icon={<PlusCircle className="w-4 h-4 text-red-700" />}
                        count={summary.only_on_file}
                        color="bg-red-50 text-red-800"
                        sectionKey="extra"
                        badgeBg="bg-red-500"
                    />
                    {!collapsed.extra && renderTable(extra, () => 'bg-red-50')}
                </div>
            )}
        </div>
    );
};

export default ResultsPanel;