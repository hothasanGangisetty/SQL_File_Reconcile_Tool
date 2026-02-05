import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Server, Database, CheckCircle2, AlertCircle } from 'lucide-react';

const ConnectionPanel = ({ onConnected }) => {
  const [config, setConfig] = useState({ environments: [] });
  const [selectedEnv, setSelectedEnv] = useState('');
  const [selectedServer, setSelectedServer] = useState('');
  const [selectedDB, setSelectedDB] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });

  // Load Config on Mount
  useEffect(() => {
    axios.get('http://127.0.0.1:5000/api/config')
      .then(res => setConfig(res.data))
      .catch(err => setStatus({ type: 'error', msg: 'Failed to load config. Is Backend running?' }));
  }, []);

  // Derived State lists
  const activeEnv = config.environments.find(e => e.env_name === selectedEnv);
  const serverList = activeEnv ? activeEnv.instances : [];
  
  const activeServer = serverList.find(s => s.host === selectedServer);
  const dbList = activeServer ? activeServer.databases : [];

  const handleConnect = async () => {
    if (!selectedServer || !selectedDB) {
        setStatus({ type: 'error', msg: 'Please select a Server and Database.' });
        return;
    }
    setLoading(true);
    setStatus({ type: '', msg: '' });
    
    try {
        const res = await axios.post('http://127.0.0.1:5000/api/connect', {
            server: selectedServer,
            database: selectedDB
        });
        
        setStatus({ type: 'success', msg: res.data.message });
        // Callback to Parent to unlock next step
        onConnected({ server: selectedServer, database: selectedDB });
        
    } catch (err) {
        const errMsg = err.response?.data?.message || err.message;
        setStatus({ type: 'error', msg: errMsg });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-700">
            <Server className="w-6 h-6" /> 
            Connection Settings
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Environment Select */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Environment</label>
                <select 
                    className="w-full p-2 border rounded-md"
                    value={selectedEnv}
                    onChange={(e) => { setSelectedEnv(e.target.value); setSelectedServer(''); setSelectedDB(''); }}
                >
                    <option value="">-- Select Env --</option>
                    {config.environments.map(env => (
                        <option key={env.env_name} value={env.env_name}>{env.env_name}</option>
                    ))}
                </select>
            </div>

            {/* Server Select */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Server</label>
                <select 
                    className="w-full p-2 border rounded-md"
                    value={selectedServer}
                    onChange={(e) => { setSelectedServer(e.target.value); setSelectedDB(''); }}
                    disabled={!selectedEnv}
                >
                    <option value="">-- Select Server --</option>
                    {serverList.map(srv => (
                        <option key={srv.host} value={srv.host}>{srv.server_label} ({srv.host})</option>
                    ))}
                </select>
            </div>

            {/* DB Select */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Database</label>
                <div className="flex gap-2">
                    <select 
                        className="w-full p-2 border rounded-md"
                        value={selectedDB}
                        onChange={(e) => setSelectedDB(e.target.value)}
                        disabled={!selectedServer}
                    >
                        <option value="">-- Select DB --</option>
                        {dbList.map(db => (
                            <option key={db} value={db}>{db}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>

        {/* Connect Button */}
        <div className="flex justify-end">
             <button 
                onClick={handleConnect}
                disabled={loading || !selectedDB}
                className={`px-6 py-2 text-white rounded-md flex items-center gap-2 ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
             >
                {loading ? 'Connecting...' : 'Test Connection'}
                {!loading && <Database className="w-4 h-4" />}
             </button>
        </div>

        {/* Status Messages */}
        {status.msg && (
            <div className={`mt-4 p-3 rounded-md flex items-start gap-2 ${status.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                {status.type === 'error' ? <AlertCircle className="w-5 h-5 mt-0.5" /> : <CheckCircle2 className="w-5 h-5 mt-0.5" />}
                <div>
                    <span className="font-bold">{status.type === 'error' ? 'Connection Failed' : 'Success'}</span>
                    <p className="text-sm mt-1">{status.msg}</p>
                </div>
            </div>
        )}
    </div>
  );
};

export default ConnectionPanel;