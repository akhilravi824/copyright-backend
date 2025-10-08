import React from 'react';
import { Search, Plus, AlertTriangle, Clock } from 'lucide-react';

const Monitoring = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monitoring</h1>
          <p className="mt-1 text-sm text-gray-500">
            Automated monitoring and detection of DSP content usage
          </p>
        </div>
        <button className="btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          Manual Scan
        </button>
      </div>

      <div className="card">
        <div className="card-body text-center py-12">
          <Search className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Automated Monitoring</h3>
          <p className="mt-1 text-sm text-gray-500">
            This feature will provide automated monitoring of DSP content across the web.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Monitoring;
