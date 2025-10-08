import React from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../contexts/AuthContext';
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  Shield,
  Activity,
  Search
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // For analysts, fetch only their own incidents
  const isAnalyst = user?.role === 'analyst';
  const apiEndpoint = isAnalyst 
    ? `/api/incidents?reporter_id=${user.id}` 
    : '/api/cases/stats/dashboard';
  
  const { data: stats, isLoading } = useQuery(
    ['dashboard-stats', user?.id, user?.role],
    async () => {
      if (isAnalyst) {
        // Fetch analyst's own incidents and calculate stats
        const response = await api.get(apiEndpoint);
        const incidents = response.data.incidents || [];
        return {
          totalCases: incidents.length,
          activeCases: incidents.filter(i => ['reported', 'under_review', 'in_progress'].includes(i.status)).length,
          resolvedCases: incidents.filter(i => ['resolved', 'closed'].includes(i.status)).length,
          criticalCases: incidents.filter(i => i.severity === 'critical').length,
          recentIncidents: incidents.slice(0, 5).map(i => ({
            id: i.id,
            title: i.title,
            type: i.incidentType || i.incident_type,
            severity: i.severity,
            status: i.status,
            date: i.createdAt || i.created_at
          }))
        };
      } else {
        // Fetch full dashboard stats for other roles
        return api.get(apiEndpoint).then(res => res.data);
      }
    },
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner" />
      </div>
    );
  }

  const overview = stats?.overview || { total: 0, open: 0, resolved: 0, critical: 0, high: 0, urgent: 0 };
  const statusBreakdown = stats?.statusBreakdown || [];
  const typeBreakdown = stats?.typeBreakdown || [];
  const monthlyTrends = stats?.monthlyTrends || [];

  const statusColors = {
    reported: '#3B82F6',
    under_review: '#F59E0B',
    in_progress: '#8B5CF6',
    resolved: '#10B981',
    closed: '#6B7280',
    escalated: '#EF4444'
  };

  const typeColors = {
    copyright_infringement: '#EF4444',
    trademark_violation: '#F59E0B',
    impersonation: '#8B5CF6',
    unauthorized_distribution: '#3B82F6',
    other: '#6B7280'
  };

  const formatMonthlyData = (data) => {
    // Handle both MongoDB aggregation format and Supabase format
    return data.map(item => {
      if (item._id && item._id.year && item._id.month) {
        // MongoDB aggregation format
        return {
          month: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`,
          count: item.count
        };
      } else if (item.month && typeof item.count !== 'undefined') {
        // Supabase format (already formatted)
        return {
          month: item.month,
          count: item.count
        };
      } else {
        // Fallback for unexpected format
        return {
          month: 'Unknown',
          count: 0
        };
      }
    }).reverse();
  };

  const StatCard = ({ title, value, icon: Icon, color, change }) => (
    <div className="card">
      <div className="card-body">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`p-3 rounded-md ${color}`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">{value}</div>
                {change && (
                  <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                    change > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <TrendingUp className="self-center flex-shrink-0 h-4 w-4" />
                    <span className="sr-only">{change > 0 ? 'Increased' : 'Decreased'} by</span>
                    {Math.abs(change)}%
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of DSP Brand Protection activities and case management
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Cases"
          value={overview.total}
          icon={FileText}
          color="bg-blue-500"
        />
        <StatCard
          title="Open Cases"
          value={overview.open}
          icon={Clock}
          color="bg-yellow-500"
        />
        <StatCard
          title="Resolved Cases"
          value={overview.resolved}
          icon={CheckCircle}
          color="bg-green-500"
        />
        <StatCard
          title="Critical Issues"
          value={overview.critical}
          icon={AlertTriangle}
          color="bg-red-500"
        />
      </div>

      {/* Charts Grid - Hide for analysts */}
      {!isAnalyst && (
      <>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Monthly Trends */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Monthly Trends</h3>
              <p className="mt-1 text-sm text-gray-500">Cases reported over time</p>
            </div>
            <div className="card-body">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formatMonthlyData(monthlyTrends)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Status Breakdown</h3>
              <p className="mt-1 text-sm text-gray-500">Distribution of case statuses</p>
            </div>
            <div className="card-body">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ status, _id, count }) => `${status || _id}: ${count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {statusBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={statusColors[entry.status || entry._id] || '#6B7280'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Type Breakdown and Recent Activity */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Incident Types */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Incident Types</h3>
            <p className="mt-1 text-sm text-gray-500">Distribution by incident type</p>
          </div>
          <div className="card-body">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
            <p className="mt-1 text-sm text-gray-500">Common tasks and shortcuts</p>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              <button 
                className="w-full btn-primary"
                onClick={() => navigate('/incidents/new')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Report New Incident
              </button>
              {!isAnalyst && (
                <>
                  <button 
                    className="w-full btn-outline"
                    onClick={() => navigate('/cases')}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Search Cases
                  </button>
                  <button 
                    className="w-full btn-outline"
                    onClick={() => navigate('/templates')}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Generate Legal Document
                  </button>
                  <button 
                    className="w-full btn-outline"
                    onClick={() => navigate('/monitoring')}
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    View Monitoring Alerts
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      </>
      )}

      {/* Priority Alerts - Hide for analysts */}
      {!isAnalyst && (overview.critical > 0 || overview.high > 0 || overview.urgent > 0) && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Priority Alerts</h3>
            <p className="mt-1 text-sm text-gray-500">Cases requiring immediate attention</p>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {overview.critical > 0 && (
                <div className="flex items-center p-3 bg-red-50 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">Critical Cases</p>
                    <p className="text-lg font-semibold text-red-900">{overview.critical}</p>
                  </div>
                </div>
              )}
              {overview.high > 0 && (
                <div className="flex items-center p-3 bg-yellow-50 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-yellow-800">High Priority</p>
                    <p className="text-lg font-semibold text-yellow-900">{overview.high}</p>
                  </div>
                </div>
              )}
              {overview.urgent > 0 && (
                <div className="flex items-center p-3 bg-orange-50 rounded-lg">
                  <Clock className="h-6 w-6 text-orange-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-orange-800">Urgent Cases</p>
                    <p className="text-lg font-semibold text-orange-900">{overview.urgent}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
