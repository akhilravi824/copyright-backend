import React from 'react';
import { BarChart3, Download, TrendingUp, FileText } from 'lucide-react';

const Reports = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Generate reports and analyze case trends and outcomes
          </p>
        </div>
        <button className="btn-primary">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </button>
      </div>

      <div className="card">
        <div className="card-body text-center py-12">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Reporting Dashboard</h3>
          <p className="mt-1 text-sm text-gray-500">
            This feature will provide comprehensive reporting and analytics capabilities.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Reports;
