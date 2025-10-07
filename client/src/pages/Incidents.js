import React, { useState } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle,
  User,
  Calendar,
  Search,
  Filter,
  Plus,
  Eye
} from 'lucide-react';

const Incidents = () => {
  const [filters, setFilters] = useState({
    status: '',
    incidentType: '',
    severity: '',
    search: '',
    page: 1
  });

  const { data, isLoading, error } = useQuery(
    ['incidents', filters],
    () => axios.get('/api/incidents', { params: filters }).then(res => res.data),
    {
      keepPreviousData: true,
    }
  );

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filters change
    }));
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      reported: { color: 'badge-info', icon: Clock },
      under_review: { color: 'badge-warning', icon: Eye },
      in_progress: { color: 'badge-warning', icon: Clock },
      resolved: { color: 'badge-success', icon: CheckCircle },
      closed: { color: 'badge-gray', icon: CheckCircle },
      escalated: { color: 'badge-danger', icon: AlertTriangle }
    };
    
    const config = statusConfig[status] || statusConfig.reported;
    const Icon = config.icon;
    
    return (
      <span className={`badge ${config.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getSeverityBadge = (severity) => {
    const severityConfig = {
      low: 'badge-gray',
      medium: 'badge-info',
      high: 'badge-warning',
      critical: 'badge-danger'
    };
    
    return (
      <span className={`badge ${severityConfig[severity]}`}>
        {severity}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading incidents</h3>
        <p className="mt-1 text-sm text-gray-500">{error.message}</p>
      </div>
    );
  }

  const { incidents, pagination } = data || { incidents: [], pagination: {} };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Incidents</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and track IP-related incidents and violations
          </p>
        </div>
        <Link to="/incidents/new" className="btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          Report Incident
        </Link>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="form-label">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  className="form-input pl-10"
                  placeholder="Search incidents..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="reported">Reported</option>
                <option value="under_review">Under Review</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
                <option value="escalated">Escalated</option>
              </select>
            </div>

            <div>
              <label className="form-label">Type</label>
              <select
                className="form-select"
                value={filters.incidentType}
                onChange={(e) => handleFilterChange('incidentType', e.target.value)}
              >
                <option value="">All Types</option>
                <option value="copyright_infringement">Copyright Infringement</option>
                <option value="trademark_violation">Trademark Violation</option>
                <option value="impersonation">Impersonation</option>
                <option value="unauthorized_distribution">Unauthorized Distribution</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="form-label">Severity</label>
              <select
                className="form-select"
                value={filters.severity}
                onChange={(e) => handleFilterChange('severity', e.target.value)}
              >
                <option value="">All Severities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => setFilters({
                  status: '',
                  incidentType: '',
                  severity: '',
                  search: '',
                  page: 1
                })}
                className="btn-outline w-full"
              >
                <Filter className="h-4 w-4 mr-2" />
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="card">
        <div className="overflow-hidden">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">Case #</th>
                <th className="table-header-cell">Title</th>
                <th className="table-header-cell">Type</th>
                <th className="table-header-cell">Status</th>
                <th className="table-header-cell">Severity</th>
                <th className="table-header-cell">Reporter</th>
                <th className="table-header-cell">Date</th>
                <th className="table-header-cell">Actions</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {incidents.length === 0 ? (
                <tr>
                  <td colSpan="8" className="table-cell text-center py-12">
                    <div className="empty-state">
                      <FileText className="empty-state-icon" />
                      <h3 className="empty-state-title">No incidents found</h3>
                      <p className="empty-state-description">
                        {filters.search || filters.status || filters.incidentType || filters.severity
                          ? 'Try adjusting your filters to see more results.'
                          : 'Get started by reporting your first incident.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                incidents.map((incident) => (
                  <tr key={incident._id} className="table-row">
                    <td className="table-cell font-mono text-sm">
                      DSP-{incident._id.slice(-8).toUpperCase()}
                    </td>
                    <td className="table-cell">
                      <div>
                        <div className="font-medium text-gray-900 truncate max-w-xs">
                          {incident.title}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {incident.infringedContent}
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-900">
                        {incident.incidentType.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="table-cell">
                      {getStatusBadge(incident.status)}
                    </td>
                    <td className="table-cell">
                      {getSeverityBadge(incident.severity)}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {incident.reporter?.firstName} {incident.reporter?.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {incident.reporter?.department}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {new Date(incident.reportedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <Link
                        to={`/incidents/${incident._id}`}
                        className="btn-outline btn-sm"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="card-footer">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((pagination.current - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.current * pagination.limit, pagination.total)} of{' '}
                {pagination.total} results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleFilterChange('page', pagination.current - 1)}
                  disabled={pagination.current === 1}
                  className="btn-outline btn-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="flex items-center px-3 py-1 text-sm text-gray-700">
                  Page {pagination.current} of {pagination.pages}
                </span>
                <button
                  onClick={() => handleFilterChange('page', pagination.current + 1)}
                  disabled={pagination.current === pagination.pages}
                  className="btn-outline btn-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Incidents;
