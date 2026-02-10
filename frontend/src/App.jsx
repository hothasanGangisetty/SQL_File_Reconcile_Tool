import React, { useState, useRef, useEffect } from 'react';
import { ConsoleProvider, useConsole } from './common_Resources/ConsoleContext';
import Sidebar from './common_Resources/Sidebar';
import ConnectionBar from './common_Resources/ConnectionBar';
import ConsolePanel from './common_Resources/ConsolePanel';
import SqlQueryTab from './module_1/SqlQueryTab';
import FileUploadTab from './module_1/FileUploadTab';
import KeysMappingTab from './module_1/KeysMappingTab';
import RunComparisonTab from './module_1/RunComparisonTab';
import SqlToSqlPlaceholder from './module_2/Placeholder';
import FileToFilePlaceholder from './module_3/Placeholder';

const TABS = [
    { id: 'sql-query',      label: 'SQL Query' },
    { id: 'file-upload',    label: 'File Upload' },
    { id: 'keys-mapping',   label: 'Keys Mapping' },
    { id: 'run-comparison', label: 'Run Comparison' },
];

// ───── Inner App (inside ConsoleProvider) ─────
const AppInner = () => {
    const { log } = useConsole();

    // ── Global state ──
    const [activeModule, setActiveModule] = useState('sql-to-file');
    const [activeTab, setActiveTab] = useState('sql-query');
    const [connection, setConnection] = useState(null);

    // ── Lifted tab state ──
    const [sqlState, setSqlState] = useState({ query: '', columns: [], rows: [], count: 0, executed: false });
    const [fileState, setFileState] = useState({ fileId: null, fileName: '', columns: [], rows: [], count: 0, uploaded: false });
    const [mappingState, setMappingState] = useState({ mapping: {}, keys: [], initialized: false });

    // ── Resizable console ──
    const [consoleHeight, setConsoleHeight] = useState(280);
    const dragging = useRef(false);
    const startY = useRef(0);
    const startH = useRef(0);

    const onMouseDown = (e) => {
        dragging.current = true;
        startY.current = e.clientY;
        startH.current = consoleHeight;
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
    };

    useEffect(() => {
        const onMouseMove = (e) => {
            if (!dragging.current) return;
            const delta = startY.current - e.clientY;
            const newH = Math.max(100, Math.min(window.innerHeight - 200, startH.current + delta));
            setConsoleHeight(newH);
        };
        const onMouseUp = () => {
            dragging.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }, [consoleHeight]);

    // ── Tab lock logic ──
    const tabEnabled = (tabId) => {
        if (!connection) return false;
        if (tabId === 'sql-query') return true;
        if (tabId === 'file-upload') return sqlState.executed;
        if (tabId === 'keys-mapping') return sqlState.executed && fileState.uploaded;
        if (tabId === 'run-comparison') return sqlState.executed && fileState.uploaded && mappingState.initialized;
        return false;
    };

    // ── Connection handlers ──
    const handleConnected = (conn) => {
        setConnection(conn);
        setTimeout(() => setActiveTab('sql-query'), 300);
    };
    const handleDisconnected = () => {
        setConnection(null);
        setActiveTab('sql-query');
        setSqlState({ query: '', columns: [], rows: [], count: 0, executed: false });
        setFileState({ fileId: null, fileName: '', columns: [], rows: [], count: 0, uploaded: false });
        setMappingState({ mapping: {}, keys: [], initialized: false });
        log('All state reset.', 'system');
    };

    // ── Next handlers ──
    const goNext = (from) => {
        const order = TABS.map(t => t.id);
        const idx = order.indexOf(from);
        if (idx >= 0 && idx < order.length - 1) {
            setActiveTab(order[idx + 1]);
        }
    };

    // ── Reset for new comparison ──
    const handleReset = () => {
        setSqlState({ query: '', columns: [], rows: [], count: 0, executed: false });
        setFileState({ fileId: null, fileName: '', columns: [], rows: [], count: 0, uploaded: false });
        setMappingState({ mapping: {}, keys: [], initialized: false });
        setActiveTab('sql-query');
        log('───── New Comparison ─────', 'header');
        log('State cleared. Ready for a new comparison.', 'system');
    };

    // ── Render active tab content ──
    const renderTab = () => {
        // Module 2 & 3 placeholders (no connection required)
        if (activeModule === 'sql-to-sql') return <SqlToSqlPlaceholder />;
        if (activeModule === 'file-to-file') return <FileToFilePlaceholder />;

        // Module 1: SQL-to-File
        if (!connection) {
            return (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                    Connect to a database to begin.
                </div>
            );
        }
        switch (activeTab) {
            case 'sql-query':
                return <SqlQueryTab connection={connection} sqlState={sqlState} setSqlState={setSqlState} onNext={() => goNext('sql-query')} />;
            case 'file-upload':
                return <FileUploadTab fileState={fileState} setFileState={setFileState} onNext={() => goNext('file-upload')} />;
            case 'keys-mapping':
                return <KeysMappingTab sqlState={sqlState} fileState={fileState} mappingState={mappingState} setMappingState={setMappingState} onNext={() => goNext('keys-mapping')} />;
            case 'run-comparison':
                return <RunComparisonTab connection={connection} sqlState={sqlState} fileState={fileState} mappingState={mappingState} onReset={handleReset} />;
            default:
                return null;
        }
    };

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-gray-100">
            {/* ── Sidebar ── */}
            <Sidebar activeModule={activeModule} onModuleChange={setActiveModule} />

            {/* ── Main Area ── */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* ── Connection Bar ── */}
                <ConnectionBar connection={connection} onConnected={handleConnected} onDisconnected={handleDisconnected} />

                {/* ── Tab Bar ── */}
                <div className="bg-white border-b border-gray-200 flex px-2 pt-1 gap-0.5 flex-shrink-0">
                    {TABS.map((tab, i) => {
                        const enabled = tabEnabled(tab.id);
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => enabled && setActiveTab(tab.id)}
                                disabled={!enabled}
                                className={`px-4 py-2 text-xs font-bold rounded-t transition-all relative
                                    ${active
                                        ? 'bg-gray-50 text-brand-900 border border-b-0 border-gray-200 -mb-px z-10'
                                        : enabled
                                        ? 'text-gray-500 hover:text-brand-700 hover:bg-brand-100/20'
                                        : 'text-gray-300 cursor-default'
                                    }`}
                            >
                                <span className="flex items-center gap-1.5">
                                    <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold flex-shrink-0
                                        ${active ? 'bg-brand-700 text-white' : enabled ? 'bg-brand-500/60 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                        {i + 1}
                                    </span>
                                    {tab.label}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* ── Content + Console Split ── */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Content area */}
                    <div className="flex-1 overflow-auto bg-gray-50">
                        {renderTab()}
                    </div>

                    {/* Drag handle */}
                    <div
                        onMouseDown={onMouseDown}
                        className="h-1.5 bg-gray-300 hover:bg-brand-700 cursor-row-resize flex-shrink-0 transition-colors relative group"
                    >
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center">
                            <div className="w-8 h-0.5 bg-gray-400 group-hover:bg-white rounded-full" />
                        </div>
                    </div>

                    {/* Console */}
                    <div style={{ height: consoleHeight }} className="flex-shrink-0 overflow-hidden">
                        <ConsolePanel />
                    </div>
                </div>
            </div>
        </div>
    );
};

// ───── Root App with Provider ─────
const App = () => (
    <ConsoleProvider>
        <AppInner />
    </ConsoleProvider>
);

export default App;