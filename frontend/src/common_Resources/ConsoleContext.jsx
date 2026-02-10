import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const ConsoleContext = createContext(null);

export const useConsole = () => {
    const ctx = useContext(ConsoleContext);
    if (!ctx) throw new Error('useConsole must be used within ConsoleProvider');
    return ctx;
};

export const ConsoleProvider = ({ children }) => {
    const [logs, setLogs] = useState([]);
    const idRef = useRef(0);

    const getTimestamp = () => {
        const now = new Date();
        return now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const log = useCallback((message, type = 'info') => {
        // type: 'info' | 'success' | 'error' | 'warn' | 'table' | 'header' | 'system'
        idRef.current += 1;
        setLogs(prev => [...prev, {
            id: idRef.current,
            time: getTimestamp(),
            message,
            type,
        }]);
    }, []);

    const logTable = useCallback((columns, rows, maxRows = 15, opts = {}) => {
        idRef.current += 1;
        const safeRows = rows || [];
        const safeCols = columns || [];
        const displayRows = safeRows.slice(0, maxRows);
        const total = opts.totalRows || safeRows.length;
        const hasEllipsis = total > displayRows.length;
        const lastRow = hasEllipsis ? (opts.lastRow || (safeRows.length > maxRows ? safeRows[safeRows.length - 1] : null)) : null;
        setLogs(prev => [...prev, {
            id: idRef.current,
            time: getTimestamp(),
            message: { columns: safeCols, rows: displayRows, total, shown: displayRows.length, hasEllipsis, lastRow },
            type: 'table',
        }]);
    }, []);

    const clear = useCallback(() => {
        setLogs([]);
    }, []);

    return (
        <ConsoleContext.Provider value={{ logs, log, logTable, clear }}>
            {children}
        </ConsoleContext.Provider>
    );
};
