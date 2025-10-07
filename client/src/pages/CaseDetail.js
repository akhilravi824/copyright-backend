import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Calendar,
  User,
  AlertTriangle,
  FileText,
  Globe,
  Mail,
  Building,
  Tag,
  CheckCircle,
  Clock,
  Edit,
  Send,
  Download,
  UserPlus,
  Eye
} from 'lucide-react';

const CaseDetail = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery(
    ['case', id],
    () => axios.get(`/api/cases/${id}`).then(res => res.data),
    {
      enabled: !!id,
    }
  );

  const updateStatusMutation = useMutation(
    (status) => axios.put(`/api/cases/${id}/status`, { status }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['case', id]);
        toast.success('Case status updated successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update status');
      },
    }
  );

  const handleStatusChange = (newStatus) => {
    updateStatusMutation.mutate(newStatus);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Case not found</h3>
        <p className="mt-1 text-sm text-gray-500">The case you're looking for doesn't exist.</p>
      </div>
    );
  }

  const { case: caseData, documents } = data;

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button className="btn-outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cases
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {caseData.title}
            </h1>
            <p className="text-sm text-gray-500">
              Case #{caseData.caseNumber}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button className="btn-outline">
            <UserPlus className="h-4 w-4 mr-2" />
            Assign
          </button>
          <button className="btn-outline">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </button>
          <button className="btn-primary">
            <Send className="h-4 w-4 mr-2" />
            Generate Document
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Case Details */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Case Details</h3>
            </div>
            <div className="card-body space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{caseData.description}</p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Infringed Content</h4>
                <p className="text-gray-700">{caseData.infringedContent || caseData.infringed_content}</p>
              </div>

              {caseData.infringedUrls && caseData.infringedUrls.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Infringed URLs</h4>
                  <div className="space-y-2">
                    {caseData.infringedUrls.map((url, index) => (
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

              {caseData.evidence && caseData.evidence.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Evidence</h4>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {caseData.evidence.map((evidence, index) => (
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

          {/* Documents */}
          {documents && documents.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Related Documents</h3>
              </div>
              <div className="card-body">
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc._id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{doc.title}</p>
                          <p className="text-xs text-gray-500">
                            {doc.type.replace('_', ' ')} • Created by {doc.createdBy?.firstName} {doc.createdBy?.lastName}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`badge ${
                          doc.status === 'sent' ? 'badge-success' :
                          doc.status === 'draft' ? 'badge-gray' :
                          doc.status === 'review' ? 'badge-warning' : 'badge-info'
                        }`}>
                          {doc.status}
                        </span>
                        <button className="btn-outline btn-sm">
                          <Eye className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {caseData.notes && caseData.notes.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Notes & Comments</h3>
              </div>
              <div className="card-body">
                <div className="space-y-3">
                  {caseData.notes.map((note, index) => (
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
              </div>
            </div>
          )}
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
                  {getStatusBadge(caseData.status)}
                </div>
                <select
                  value={caseData.status}
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
              </div>

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
            </div>
          </div>

          {/* Case Information */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Case Information</h3>
            </div>
            <div className="card-body space-y-4">
              <div>
                <label className="form-label">Type</label>
                <p className="text-sm text-gray-900">
                  {(caseData.incidentType || caseData.incident_type || '').replace('_', ' ')}
                </p>
              </div>

              <div>
                <label className="form-label">Severity</label>
                <div className="mt-1">
                  {getSeverityBadge(caseData.severity)}
                </div>
              </div>

              <div>
                <label className="form-label">Priority</label>
                <p className="text-sm text-gray-900 capitalize">{caseData.priority}</p>
              </div>

              <div>
                <label className="form-label">Reported Date</label>
                <div className="flex items-center text-sm text-gray-900">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  {new Date(caseData.reportedAt || caseData.reported_at).toLocaleDateString()}
                </div>
              </div>

              <div>
                <label className="form-label">Last Updated</label>
                <div className="flex items-center text-sm text-gray-900">
                  <Clock className="h-4 w-4 mr-2 text-gray-400" />
                  {new Date(caseData.lastUpdated).toLocaleDateString()}
                </div>
              </div>

              {caseData.tags && caseData.tags.length > 0 && (
                <div>
                  <label className="form-label">Tags</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {caseData.tags.map((tag, index) => (
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
                    {caseData.reporter?.firstName} {caseData.reporter?.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{caseData.reporter?.email}</p>
                  <p className="text-xs text-gray-500">{caseData.reporter?.department}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Assigned To */}
          {caseData.assignedTo && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Assigned To</h3>
              </div>
              <div className="card-body space-y-3">
                <div className="flex items-center space-x-3">
                  <User className="h-8 w-8 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {caseData.assignedTo.firstName} {caseData.assignedTo.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{caseData.assignedTo.email}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Infringer Information */}
          {caseData.infringerInfo && Object.keys(caseData.infringerInfo).length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Infringer Information</h3>
              </div>
              <div className="card-body space-y-3">
                {caseData.infringerInfo.name && (
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-900">{caseData.infringerInfo.name}</span>
                  </div>
                )}
                {caseData.infringerInfo.email && (
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-900">{caseData.infringerInfo.email}</span>
                  </div>
                )}
                {caseData.infringerInfo.website && (
                  <div className="flex items-center space-x-2">
                    <Globe className="h-4 w-4 text-gray-400" />
                    <a
                      href={caseData.infringerInfo.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {caseData.infringerInfo.website}
                    </a>
                  </div>
                )}
                {caseData.infringerInfo.organization && (
                  <div className="flex items-center space-x-2">
                    <Building className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-900">{caseData.infringerInfo.organization}</span>
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

export default CaseDetail;
