import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../api/api';
import toast from 'react-hot-toast';
import DeleteIncidentButton from '../components/DeleteIncidentButton';
import { useAuth } from '../contexts/AuthContext';
import {
  ArrowLeft,
  Calendar,
  User,
  AlertTriangle,
  FileText,
  Globe,
  Mail,
  Phone,
  Building,
  Tag,
  MessageSquare,
  CheckCircle,
  Clock,
  Edit,
  Send,
  Download
} from 'lucide-react';

const IncidentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Check if user is analyst (restricted role)
  const isAnalyst = user?.role === 'analyst';

  const { data: incident, isLoading } = useQuery(
    ['incident', id],
    () => api.get(`/api/incidents/${id}`).then(res => res.data),
    {
      enabled: !!id,
    }
  );

  const updateStatusMutation = useMutation(
    (status) => api.put(`/api/incidents/${id}/status`, { status }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['incident', id]);
        toast.success('Status updated successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update status');
      }
    }
  );

  const addNoteMutation = useMutation(
    (content) => api.post(`/api/incidents/${id}/notes`, { content }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['incident', id]);
        toast.success('Note added successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to add note');
      }
    }
  );

  const [newNote, setNewNote] = React.useState('');

  const handleStatusChange = (newStatus) => {
    updateStatusMutation.mutate(newStatus);
  };

  const handleAddNote = (e) => {
    e.preventDefault();
    if (newNote.trim()) {
      addNoteMutation.mutate(newNote);
      setNewNote('');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      reported: { color: 'badge-info', icon: Clock },
      under_review: { color: 'badge-warning', icon: AlertTriangle },
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

  if (!incident) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Incident not found</h3>
        <p className="mt-1 text-sm text-gray-500">The incident you're looking for doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/incidents')}
            className="btn-outline"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Incidents
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {incident.title}
            </h1>
            <p className="text-sm text-gray-500">
              Case #{incident.caseNumber}
            </p>
          </div>
        </div>
        {!isAnalyst && (
          <div className="flex space-x-2">
            <button className="btn-outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </button>
            <button className="btn-outline">
              <Send className="h-4 w-4 mr-2" />
              Generate Document
            </button>
            <DeleteIncidentButton 
              incident={incident} 
              onSuccess={() => navigate('/incidents')} 
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Incident Details */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Incident Details</h3>
            </div>
            <div className="card-body space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{incident.description}</p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Infringed Content</h4>
                <p className="text-gray-700">{incident.infringedContent || incident.infringed_content}</p>
              </div>

              {incident.infringedUrls && incident.infringedUrls.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Infringed URLs</h4>
                  <div className="space-y-2">
                    {incident.infringedUrls.map((url, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                        <Globe className="h-4 w-4 text-gray-400" />
                        <div className="flex-1">
                          <a
                            href={url.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            {url.url}
                          </a>
                          {url.description && (
                            <p className="text-xs text-gray-500">{url.description}</p>
                          )}
                        </div>
                        {url.verified && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {incident.evidence && incident.evidence.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Evidence</h4>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {incident.evidence.map((evidence, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{evidence.filename}</p>
                          {evidence.description && (
                            <p className="text-xs text-gray-500">{evidence.description}</p>
                          )}
                        </div>
                        <button className="btn-outline btn-sm">
                          <Download className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Notes & Comments</h3>
            </div>
            <div className="card-body space-y-4">
              {/* Add Note Form */}
              <form onSubmit={handleAddNote} className="space-y-3">
                <div>
                  <label className="form-label">Add Note</label>
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="form-textarea h-20"
                    placeholder="Add a note or comment about this incident..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newNote.trim() || addNoteMutation.isLoading}
                  className="btn-primary"
                >
                  {addNoteMutation.isLoading ? (
                    <div className="loading-spinner mr-2" />
                  ) : (
                    <MessageSquare className="h-4 w-4 mr-2" />
                  )}
                  Add Note
                </button>
              </form>

              {/* Existing Notes */}
              {incident.notes && incident.notes.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Previous Notes</h4>
                  {incident.notes.map((note, index) => (
                    <div key={index} className="border-l-4 border-blue-200 pl-4 py-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {note.author?.firstName} {note.author?.lastName}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(note.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{note.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status & Actions */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Status & Actions</h3>
            </div>
            <div className="card-body space-y-4">
              <div>
                <label className="form-label">Current Status</label>
                <div className="mb-3">
                  {getStatusBadge(incident.status)}
                </div>
                {!isAnalyst && (
                  <select
                    value={incident.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="form-select"
                    disabled={updateStatusMutation.isLoading}
                  >
                    <option value="reported">Reported</option>
                    <option value="under_review">Under Review</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                    <option value="escalated">Escalated</option>
                  </select>
                )}
              </div>

              {!isAnalyst && (
                <div className="space-y-2">
                  <button className="btn-primary w-full">
                    <Send className="h-4 w-4 mr-2" />
                    Send Cease & Desist
                  </button>
                  <button className="btn-outline w-full">
                    <FileText className="h-4 w-4 mr-2" />
                    Generate DMCA Notice
                  </button>
                  <button className="btn-outline w-full">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Report Abuse
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Incident Information */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Incident Information</h3>
            </div>
            <div className="card-body space-y-4">
              <div>
                <label className="form-label">Type</label>
                <p className="text-sm text-gray-900">
                  {(incident.incidentType || incident.incident_type || '').replace('_', ' ')}
                </p>
              </div>

              <div>
                <label className="form-label">Severity</label>
                <div className="mt-1">
                  {getSeverityBadge(incident.severity)}
                </div>
              </div>

              <div>
                <label className="form-label">Priority</label>
                <p className="text-sm text-gray-900 capitalize">{incident.priority}</p>
              </div>

              <div>
                <label className="form-label">Reported Date</label>
                <div className="flex items-center text-sm text-gray-900">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  {new Date(incident.reportedAt || incident.reported_at).toLocaleDateString()}
                </div>
              </div>

              <div>
                <label className="form-label">Last Updated</label>
                <div className="flex items-center text-sm text-gray-900">
                  <Clock className="h-4 w-4 mr-2 text-gray-400" />
                  {new Date(incident.lastUpdated).toLocaleDateString()}
                </div>
              </div>

              {incident.tags && incident.tags.length > 0 && (
                <div>
                  <label className="form-label">Tags</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {incident.tags.map((tag, index) => (
                      <span key={index} className="badge badge-gray">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Reporter Information */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Reporter</h3>
            </div>
            <div className="card-body space-y-3">
              <div className="flex items-center space-x-3">
                <User className="h-8 w-8 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {incident.reporter?.firstName} {incident.reporter?.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{incident.reporter?.email}</p>
                  <p className="text-xs text-gray-500">{incident.reporter?.department}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Infringer Information */}
          {incident.infringerInfo && Object.keys(incident.infringerInfo).length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Infringer Information</h3>
              </div>
              <div className="card-body space-y-3">
                {incident.infringerInfo.name && (
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-900">{incident.infringerInfo.name}</span>
                  </div>
                )}
                {incident.infringerInfo.email && (
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-900">{incident.infringerInfo.email}</span>
                  </div>
                )}
                {incident.infringerInfo.website && (
                  <div className="flex items-center space-x-2">
                    <Globe className="h-4 w-4 text-gray-400" />
                    <a
                      href={incident.infringerInfo.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {incident.infringerInfo.website}
                    </a>
                  </div>
                )}
                {incident.infringerInfo.organization && (
                  <div className="flex items-center space-x-2">
                    <Building className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-900">{incident.infringerInfo.organization}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IncidentDetail;
