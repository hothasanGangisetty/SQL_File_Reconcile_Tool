import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useConsole } from '../context/ConsoleContext';
import { Plug, Unplug } from 'lucide-react';

const ConnectionBar = ({ connection, onConnected, onDisconnected }) => {
    const { log } = useConsole();
    const [config, setConfig] = useState({ environments: [] });
    const [selectedEnv, setSelectedEnv] = useState('');
    const [selectedServer, setSelectedServer] = useState('');
    const [selectedDB, setSelectedDB] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        axios.get('http://127.0.0.1:5000/api/config')
            .then(res => {
                setConfig(res.data);
                log('Configuration loaded. Select an environment to begin.', 'system');
            })
            .catch(() => log('Failed to load config. Is the backend running on port 5000?', 'error'));
    }, []);

    const activeEnv = config.environments.find(e => e.env_name === selectedEnv);
    const serverList = activeEnv ? activeEnv.instances : [];
    const activeServer = serverList.find(s => s.host === selectedServer);
    const dbList = activeServer ? activeServer.databases : [];

    const handleConnect = async () => {
        if (!selectedServer || !selectedDB) return;
        setLoading(true);
        log(`Connecting to ${selectedServer} / ${selectedDB} ...`, 'info');

        try {
            const res = await axios.post('http://127.0.0.1:5000/api/connect', {
                server: selectedServer,
                database: selectedDB
            });
            log(`Connected to ${selectedServer} / ${selectedDB} — ${res.data.message}`, 'success');
            log('Proceed to SQL Query tab to begin.', 'system');
            onConnected({ server: selectedServer, database: selectedDB, env: selectedEnv });
        } catch (err) {
            const msg = err.response?.data?.message || err.message;
            log(`Connection failed: ${msg}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = () => {
        log(`Disconnected from ${connection.server} / ${connection.database}`, 'warn');
        onDisconnected();
        setSelectedEnv('');
        setSelectedServer('');
        setSelectedDB('');
    };

    const isConnected = !!connection;

    return (
        <div className="bg-brand-900 px-4 py-2 flex items-center gap-3 border-b border-brand-700/30 flex-shrink-0">
            {/* Status Dot */}
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isConnected ? 'bg-brand-300 shadow-brand-300/50 shadow-sm' : 'bg-gray-600'}`} />

            {!isConnected ? (
                <>
                    {/* Env */}
                    <select
                        className="bg-brand-900/80 text-gray-200 text-xs px-2 py-1.5 rounded border border-brand-700/40 focus:border-brand-500 outline-none"
                        value={selectedEnv}
                        onChange={e => { setSelectedEnv(e.target.value); setSelectedServer(''); setSelectedDB(''); }}
                    >
                        <option value="">Environment</option>
                        {config.environments.map(env => (
                            <option key={env.env_name} value={env.env_name}>{env.env_name}</option>
                        ))}
                    </select>

                    {/* Server */}
                    <select
                        className="bg-brand-900/80 text-gray-200 text-xs px-2 py-1.5 rounded border border-brand-700/40 focus:border-brand-500 outline-none disabled:opacity-40"
                        value={selectedServer}
                        onChange={e => { setSelectedServer(e.target.value); setSelectedDB(''); }}
                        disabled={!selectedEnv}
                    >
                        <option value="">Server</option>
                        {serverList.map(srv => (
                            <option key={srv.host} value={srv.host}>{srv.server_label}</option>
                        ))}
                    </select>

                    {/* DB */}
                    <select
                        className="bg-brand-900/80 text-gray-200 text-xs px-2 py-1.5 rounded border border-brand-700/40 focus:border-brand-500 outline-none disabled:opacity-40"
                        value={selectedDB}
                        onChange={e => setSelectedDB(e.target.value)}
                        disabled={!selectedServer}
                    >
                        <option value="">Database</option>
                        {dbList.map(db => (
                            <option key={db} value={db}>{db}</option>
                        ))}
                    </select>

                    {/* Connect */}
                    <button
                        onClick={handleConnect}
                        disabled={!selectedDB || loading}
                        className="bg-brand-700 hover:bg-brand-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs px-3 py-1.5 rounded font-bold flex items-center gap-1.5 transition-colors"
                    >
                        <Plug className="w-3.5 h-3.5" />
                        {loading ? 'Connecting...' : 'Connect'}
                    </button>
                </>
            ) : (
                <>
                    {/* Connected Info */}
                    <span className="text-brand-300 text-xs font-bold">Connected</span>
                    <span className="text-gray-400 text-xs">
                        {connection.env} &rarr; {connection.server} &rarr; <strong className="text-gray-200">{connection.database}</strong>
                    </span>
                    <div className="flex-1" />
                    <button
                        onClick={handleDisconnect}
                        className="bg-red-900/50 hover:bg-red-800 text-red-300 text-xs px-3 py-1.5 rounded font-bold flex items-center gap-1.5 transition-colors"
                    >
                        <Unplug className="w-3.5 h-3.5" />
                        Disconnect
                    </button>
                </>
            )}
        </div>
    );
};

export default ConnectionBar;
