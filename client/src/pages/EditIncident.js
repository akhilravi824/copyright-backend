import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../api/api';
import toast from 'react-hot-toast';
import {
  Upload,
  Link as LinkIcon,
  Plus,
  X,
  AlertTriangle,
  FileText,
  Globe,
  User,
  ArrowLeft
} from 'lucide-react';

const EditIncident = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [infringedUrls, setInfringedUrls] = useState([]);
  const [newUrl, setNewUrl] = useState({ url: '', description: '' });
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // Fetch incident data
  const { data: incident, isLoading } = useQuery(
    ['incident', id],
    () => api.get(`/api/incidents/${id}`).then(res => res.data),
    {
      enabled: !!id,
      onSuccess: (data) => {
        // Populate form with existing data
        setValue('title', data.title);
        setValue('description', data.description);
        setValue('incidentType', data.incidentType);
        setValue('severity', data.severity);
        setValue('priority', data.priority);
        setValue('infringedContent', data.infringedContent);
        setValue('infringerName', data.infringerInfo?.name || '');
        setValue('infringerEmail', data.infringerInfo?.email || '');
        setValue('infringerWebsite', data.infringerInfo?.website || '');
        setValue('infringerContact', data.infringerInfo?.contactInfo || '');
        setValue('infringerOrganization', data.infringerInfo?.organization || '');
        
        // Set URLs
        if (data.infringedUrls) {
          setInfringedUrls(data.infringedUrls.map((url, index) => ({
            ...url,
            id: url.id || Date.now() + index
          })));
        }
      }
    }
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm({
    defaultValues: {
      incidentType: 'copyright_infringement',
      severity: 'medium',
      priority: 'normal'
    }
  });

  const incidentType = watch('incidentType');

  const addUrl = () => {
    if (newUrl.url.trim()) {
      // Auto-add https:// if no protocol is provided
      let url = newUrl.url.trim();
      if (!url.match(/^https?:\/\//i)) {
        url = `https://${url}`;
      }
      
      setInfringedUrls([...infringedUrls, { ...newUrl, url, id: Date.now() }]);
      setNewUrl({ url: '', description: '' });
    }
  };

  const removeUrl = (id) => {
    setInfringedUrls(infringedUrls.filter(url => url.id !== id));
  };

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;

    setLoading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });

      const response = await api.post('/api/upload/multiple', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const newFiles = response.data.files.map(file => ({
        id: Date.now() + Math.random(),
        name: file.originalname,
        url: file.url,
        size: file.size
      }));

      setUploadedFiles([...uploadedFiles, ...newFiles]);
      toast.success(`${newFiles.length} file(s) uploaded successfully`);
    } catch (error) {
      console.error('File upload error:', error);
      toast.error('Failed to upload files');
    } finally {
      setLoading(false);
    }
  };

  const removeFile = (id) => {
    setUploadedFiles(uploadedFiles.filter(file => file.id !== id));
  };

  // Update incident mutation
  const updateIncidentMutation = useMutation(
    (formData) => {
      const incidentData = {
        title: formData.title,
        description: formData.description,
        incidentType: formData.incidentType,
        severity: formData.severity,
        priority: formData.priority,
        infringedContent: formData.infringedContent,
        infringedUrls: infringedUrls,
        infringerInfo: {
          name: formData.infringerName,
          email: formData.infringerEmail,
          website: formData.infringerWebsite,
          contactInfo: formData.infringerContact,
          organization: formData.infringerOrganization
        },
        evidenceFiles: uploadedFiles
      };

      return api.put(`/api/incidents/${id}`, incidentData);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['incident', id]);
        toast.success('Incident updated successfully');
        navigate(`/incidents/${id}`);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update incident');
      }
    }
  );

  const onSubmit = (data) => {
    updateIncidentMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Incident
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Edit Incident</h1>
          <p className="mt-2 text-gray-600">
            Update incident details and information
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Incident Title *
                </label>
                <input
                  {...register('title', { required: 'Title is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter incident title"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Incident Type *
                </label>
                <select
                  {...register('incidentType', { required: 'Incident type is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="copyright_infringement">Copyright Infringement</option>
                  <option value="trademark_infringement">Trademark Infringement</option>
                  <option value="patent_infringement">Patent Infringement</option>
                  <option value="trade_secret">Trade Secret</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Severity *
                </label>
                <select
                  {...register('severity', { required: 'Severity is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority *
                </label>
                <select
                  {...register('priority', { required: 'Priority is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                {...register('description', { required: 'Description is required' })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe the incident in detail"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>
          </div>

          {/* Infringed Content */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Infringed Content</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Infringed Content *
              </label>
              <input
                {...register('infringedContent', { required: 'Infringed content is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe the content that was infringed"
              />
              {errors.infringedContent && (
                <p className="mt-1 text-sm text-red-600">{errors.infringedContent.message}</p>
              )}
            </div>

            {/* Infringed URLs */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Infringed URLs
              </label>
              
              <div className="space-y-3">
                {infringedUrls.map((url) => (
                  <div key={url.id} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
                    <Globe className="h-4 w-4 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{url.url}</p>
                      {url.description && (
                        <p className="text-xs text-gray-500">{url.description}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeUrl(url.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex space-x-2">
                <input
                  type="text"
                  value={newUrl.url}
                  onChange={(e) => setNewUrl({ ...newUrl, url: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter URL"
                />
                <input
                  type="text"
                  value={newUrl.description}
                  onChange={(e) => setNewUrl({ ...newUrl, description: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Description (optional)"
                />
                <button
                  type="button"
                  onClick={addUrl}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Infringer Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Infringer Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Infringer Name
                </label>
                <input
                  {...register('infringerName')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter infringer name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Infringer Email
                </label>
                <input
                  {...register('infringerEmail')}
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter infringer email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Infringer Website
                </label>
                <input
                  {...register('infringerWebsite')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter infringer website"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Information
                </label>
                <input
                  {...register('infringerContact')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter contact information"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization
                </label>
                <input
                  {...register('infringerOrganization')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter organization name"
                />
              </div>
            </div>
          </div>

          {/* Evidence Files */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Evidence Files</h2>
            
            {uploadedFiles.length > 0 && (
              <div className="mb-4 space-y-2">
                {uploadedFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500">{file.size} bytes</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(file.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      Upload evidence files
                    </span>
                    <input
                      type="file"
                      multiple
                      onChange={(e) => handleFileUpload(e.target.files)}
                      className="sr-only"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                    />
                  </label>
                  <p className="mt-1 text-xs text-gray-500">
                    PDF, DOC, DOCX, JPG, PNG, GIF up to 10MB each
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateIncidentMutation.isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {updateIncidentMutation.isLoading ? 'Updating...' : 'Update Incident'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditIncident;
