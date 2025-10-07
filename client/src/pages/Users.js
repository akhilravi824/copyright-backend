import React from 'react';
import { Users, Plus, User, Mail, Phone, Building } from 'lucide-react';

const UsersPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage system users, roles, and permissions
          </p>
        </div>
        <button className="btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </button>
      </div>

      <div className="card">
        <div className="card-body text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">User Management</h3>
          <p className="mt-1 text-sm text-gray-500">
            This feature will allow administrators to manage system users and permissions.
          </p>
          <div className="mt-6">
            <button className="btn-primary">
              <Users className="h-4 w-4 mr-2" />
              Coming Soon
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsersPage;
