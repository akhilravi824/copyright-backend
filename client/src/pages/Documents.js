import React from 'react';
import { FileText, Plus, Search, Filter } from 'lucide-react';

const Documents = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage legal documents, templates, and correspondence
          </p>
        </div>
        <button className="btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          Create Document
        </button>
      </div>

      <div className="card">
        <div className="card-body text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Document Management</h3>
          <p className="mt-1 text-sm text-gray-500">
            This feature will allow you to create, manage, and track legal documents.
          </p>
          <div className="mt-6">
            <button className="btn-primary">
              <FileText className="h-4 w-4 mr-2" />
              Coming Soon
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documents;
