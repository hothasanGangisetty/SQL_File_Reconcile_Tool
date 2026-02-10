import React from 'react';
import { FileText } from 'lucide-react';

const Placeholder = () => (
    <div className="h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
        <FileText className="w-16 h-16 text-gray-300" />
        <h2 className="text-xl font-bold text-gray-400">File-to-File Comparison</h2>
        <p className="text-sm text-gray-400 max-w-md">
            Compare two uploaded files (CSV/Excel) against each other without any database.
            This module is under development and will be available in a future release.
        </p>
        <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-bold">
            Coming Soon
        </span>
    </div>
);

export default Placeholder;
