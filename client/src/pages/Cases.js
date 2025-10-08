import React from 'react';
import { useQuery } from 'react-query';
import api from '../api/api';
import { Link, useLocation } from 'react-router-dom';
import SearchSuggestions from '../components/SearchSuggestions';
import {
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle,
  User,
  Calendar,
  Filter,
  Eye,
  BarChart3,
  TrendingUp,
  Search
} from 'lucide-react';

const Cases = () => {
  const location = useLocation();
  
  // Initialize filters from URL parameters
  const urlParams = new URLSearchParams(location.search);
  const [filters, setFilters] = React.useState({
    status: urlParams.get('status') || '',
    incidentType: urlParams.get('incidentType') || '',
    severity: urlParams.get('severity') || '',
    priority: urlParams.get('priority') || '',
    assignedTo: urlParams.get('assignedTo') || '',
    search: urlParams.get('search') || '',
    view: urlParams.get('view') || 'all',
    sort: urlParams.get('sort') || 'date_desc',
    page: parseInt(urlParams.get('page')) || 1
  });

  const { data, isLoading, error } = useQuery(
    ['cases', filters],
    () => {
      console.log('🌐 Fetching cases with filters:', filters);
      return api.get('/api/cases', { params: filters }).then(res => {
        console.log('✅ Cases data received:', res.data);
        return res.data;
      });
    },
    {
      keepPreviousData: true,
    }
  );

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1
    }));
  };

  const handleSearch = (searchTerm) => {
    console.log('🔍 Search triggered:', searchTerm);
    setFilters(prev => ({
      ...prev,
      search: searchTerm,
      page: 1
    }));
  };

  const handleSuggestionSelect = (suggestion) => {
    if (suggestion.type === 'case') {
      // Navigate to case detail
      window.location.href = `/cases/${suggestion.id}`;
    } else if (suggestion.type === 'user') {
      // Filter by assigned user
      setFilters(prev => ({
        ...prev,
        assignedTo: suggestion.id,
        page: 1
      }));
    } else if (suggestion.type === 'term') {
      // Apply search term
      setFilters(prev => ({
        ...prev,
        search: suggestion.value,
        page: 1
      }));
    }
  };

  const handleQuickFilter = (filterUpdate) => {
    setFilters(prev => ({
      ...prev,
      ...filterUpdate,
      page: 1
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

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      low: 'badge-gray',
      normal: 'badge-info',
      high: 'badge-warning',
      urgent: 'badge-danger'
    };
    
    return (
      <span className={`badge ${priorityConfig[priority]}`}>
        {priority}
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
        <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading cases</h3>
        <p className="mt-1 text-sm text-gray-500">{error.message}</p>
      </div>
    );
  }

  const { cases = [], pagination = {}, stats = { total: 0, open: 0, resolved: 0, critical: 0 } } = data || {};
  
  // Ensure pagination has default values
  const paginationData = {
    current: pagination.current || pagination.page || 1,
    limit: pagination.limit || 10,
    total: pagination.total || 0,
    pages: pagination.pages || 1
  };

  const severityRank = { critical: 4, high: 3, medium: 2, low: 1 };
  const sortedCases = [...cases].sort((a, b) => {
    const sort = filters.sort;
    const aDate = new Date(a.reportedAt || a.reported_at || a.createdAt || a.created_at || 0).getTime();
    const bDate = new Date(b.reportedAt || b.reported_at || b.createdAt || b.created_at || 0).getTime();
    const aSev = severityRank[a.severity] || 0;
    const bSev = severityRank[b.severity] || 0;
    switch (sort) {
      case 'date_asc':
        return aDate - bDate;
      case 'severity_desc':
        return bSev - aSev || bDate - aDate;
      case 'severity_asc':
        return aSev - bSev || aDate - bDate;
      case 'date_desc':
      default:
        return bDate - aDate;
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Case Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage and track all IP-related cases and their progress
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-3 rounded-md bg-blue-500">
                  <FileText className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Cases</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.total}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-3 rounded-md bg-yellow-500">
                  <Clock className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Open Cases</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.open}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-3 rounded-md bg-green-500">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Resolved</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.resolved}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-3 rounded-md bg-red-500">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Critical</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.critical}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Filters & Search</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div>
              <label className="form-label">View</label>
              <select
                className="form-select"
                value={filters.view}
                onChange={(e) => handleFilterChange('view', e.target.value)}
              >
                <option value="all">All Cases</option>
                <option value="my">My Cases</option>
                <option value="assigned">Assigned to Me</option>
                <option value="open">Open Cases</option>
                <option value="resolved">Resolved Cases</option>
              </select>
            </div>

            <div>
              <label className="form-label">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by title, description, or case number..."
                  className="form-input pl-10 w-full"
                  value={filters.search}
                  onChange={(e) => handleSearch(e.target.value)}
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
                  priority: '',
                  assignedTo: '',
                  search: '',
                  view: 'all',
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

      {/* Cases Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">Case #</th>
                <th className="table-header-cell">Title</th>
                <th className="table-header-cell">Type</th>
                <th className="table-header-cell">Status</th>
                <th className="table-header-cell">Severity</th>
                <th className="table-header-cell">Priority</th>
                <th className="table-header-cell">Assigned To</th>
                <th className="table-header-cell">Date</th>
                <th className="table-header-cell text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {cases.length === 0 ? (
                <tr>
                  <td colSpan="9" className="table-cell text-center py-12">
                    <div className="empty-state">
                      <FileText className="empty-state-icon" />
                      <h3 className="empty-state-title">No cases found</h3>
                      <p className="empty-state-description">
                        {filters.search || filters.status || filters.incidentType || filters.severity
                          ? 'Try adjusting your filters to see more results.'
                          : 'No cases match your current view.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedCases.map((case_) => (
                  <tr key={case_.id} className="table-row">
                    <td className="table-cell font-mono text-sm">
                      {case_.caseNumber}
                    </td>
                    <td className="table-cell">
                      <div>
                        <div className="font-medium text-gray-900 truncate max-w-xs">
                          {case_.title}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {case_.infringedContent || case_.infringed_content}
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-900">
                        {(case_.incidentType || case_.incident_type || '').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="table-cell">
                      {getStatusBadge(case_.status)}
                    </td>
                    <td className="table-cell">
                      {getSeverityBadge(case_.severity)}
                    </td>
                    <td className="table-cell">
                      {getPriorityBadge(case_.priority)}
                    </td>
                    <td className="table-cell">
                      {case_.assignedTo ? (
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {case_.assignedTo.firstName} {case_.assignedTo.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {case_.assignedTo.email}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Unassigned</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {new Date(case_.reportedAt || case_.reported_at).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell whitespace-nowrap text-right">
                      <Link
                        to={`/cases/${case_.id}`}
                        className="btn-outline btn-sm inline-flex"
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
        {paginationData && paginationData.pages > 1 && (
          <div className="card-footer">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((paginationData.current - 1) * paginationData.limit) + 1} to{' '}
                {Math.min(paginationData.current * paginationData.limit, paginationData.total)} of{' '}
                {paginationData.total} results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleFilterChange('page', paginationData.current - 1)}
                  disabled={paginationData.current === 1}
                  className="btn-outline btn-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="flex items-center px-3 py-1 text-sm text-gray-700">
                  Page {paginationData.current} of {paginationData.pages}
                </span>
                <button
                  onClick={() => handleFilterChange('page', paginationData.current + 1)}
                  disabled={paginationData.current === paginationData.pages}
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

export default Cases;
