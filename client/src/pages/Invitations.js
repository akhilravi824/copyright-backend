import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../api/api';
import { useAuth } from '../contexts/AuthContext';
import {
  UserPlus,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Trash2,
  Filter,
  Search,
  Plus,
  Eye,
  Calendar,
  User
} from 'lucide-react';

const Invitations = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    page: 1,
    limit: 20
  });

  // Fetch invitations
  const { data, isLoading, error } = useQuery(
    ['invitations', filters],
    () => api.get('/api/invitations', { params: filters }).then(res => res.data),
    {
      keepPreviousData: true,
    }
  );

  // Create invitation mutation
  const createInvitationMutation = useMutation(
    (invitationData) => api.post('/api/invitations', invitationData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['invitations']);
        setShowCreateForm(false);
      },
    }
  );

  // Resend invitation mutation
  const resendInvitationMutation = useMutation(
    (invitationId) => api.post(`/api/invitations/${invitationId}/resend`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['invitations']);
      },
    }
  );

  // Cancel invitation mutation
  const cancelInvitationMutation = useMutation(
    (invitationId) => api.post(`/api/invitations/${invitationId}/cancel`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['invitations']);
      },
    }
  );

  const handleCreateInvitation = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const invitationData = {
      email: formData.get('email'),
      role: formData.get('role'),
      department: formData.get('department'),
      job_title: formData.get('job_title'),
      custom_message: formData.get('custom_message')
    };
    createInvitationMutation.mutate(invitationData);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'expired':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'revoked':
        return <Trash2 className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'revoked':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Only administrators can manage user invitations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Invitations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage user invitations and track invitation status
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn-primary flex items-center"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Invite User
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Mail className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Invitations
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {data?.total || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {data?.invitations?.filter(i => i.invitation_status === 'pending').length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Accepted
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {data?.invitations?.filter(i => i.invitation_status === 'accepted').length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Expired/Revoked
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {data?.invitations?.filter(i => ['expired', 'revoked'].includes(i.invitation_status)).length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by email..."
                  className="input pl-10"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                className="input"
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="expired">Expired</option>
                <option value="revoked">Revoked</option>
              </select>
            </div>
            <button
              onClick={() => setFilters({ status: '', search: '', page: 1, limit: 20 })}
              className="btn-outline flex items-center"
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Invitations Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Invitations</h3>
        </div>
        <div className="card-body p-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600">Error loading invitations</p>
            </div>
          ) : !data?.invitations?.length ? (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No invitations found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invited By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invited At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expires At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.invitations.map((invitation) => (
                    <tr key={invitation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">
                            {invitation.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">
                            {invitation.role}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(invitation.invitation_status)}
                          <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invitation.invitation_status)}`}>
                            {invitation.invitation_status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invitation.invited_by?.first_name} {invitation.invited_by?.last_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          {new Date(invitation.invited_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 text-gray-400 mr-2" />
                          {new Date(invitation.expires_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {invitation.invitation_status === 'pending' && (
                            <>
                              <button
                                onClick={() => resendInvitationMutation.mutate(invitation.id)}
                                disabled={resendInvitationMutation.isLoading}
                                className="text-blue-600 hover:text-blue-900 flex items-center"
                              >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Resend
                              </button>
                              <button
                                onClick={() => cancelInvitationMutation.mutate(invitation.id)}
                                disabled={cancelInvitationMutation.isLoading}
                                className="text-red-600 hover:text-red-900 flex items-center"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Cancel
                              </button>
                            </>
                          )}
                          <button className="text-gray-600 hover:text-gray-900 flex items-center">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Invitation Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Invite New User</h3>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={handleCreateInvitation} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    className="input w-full"
                    placeholder="user@company.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                  </label>
                  <select name="role" required className="input w-full">
                    <option value="staff">Staff</option>
                    <option value="manager">Manager</option>
                    <option value="legal">Legal</option>
                    <option value="viewer">Viewer</option>
                    <option value="analyst">Analyst</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <select name="department" className="input w-full">
                    <option value="">Select Department</option>
                    <option value="legal">Legal</option>
                    <option value="marketing">Marketing</option>
                    <option value="crr">CRR</option>
                    <option value="management">Management</option>
                    <option value="it">IT</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job Title
                  </label>
                  <input
                    type="text"
                    name="job_title"
                    className="input w-full"
                    placeholder="e.g., Legal Counsel"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custom Message
                  </label>
                  <textarea
                    name="custom_message"
                    rows={3}
                    className="input w-full"
                    placeholder="Optional welcome message..."
                  />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createInvitationMutation.isLoading}
                    className="btn-primary"
                  >
                    {createInvitationMutation.isLoading ? 'Sending...' : 'Send Invitation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invitations;
