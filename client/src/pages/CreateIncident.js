import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Upload,
  Link as LinkIcon,
  Plus,
  X,
  AlertTriangle,
  FileText,
  Globe,
  User
} from 'lucide-react';

const CreateIncident = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [infringedUrls, setInfringedUrls] = useState([]);
  const [newUrl, setNewUrl] = useState({ url: '', description: '' });
  const [uploadedFiles, setUploadedFiles] = useState([]);

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
      setInfringedUrls([...infringedUrls, { ...newUrl, id: Date.now() }]);
      setNewUrl({ url: '', description: '' });
    }
  };

  const removeUrl = (id) => {
    setInfringedUrls(infringedUrls.filter(url => url.id !== id));
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const newFiles = files.map(file => ({
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      size: file.size,
      type: file.type
    }));
    setUploadedFiles([...uploadedFiles, ...newFiles]);
  };

  const removeFile = (id) => {
    setUploadedFiles(uploadedFiles.filter(file => file.id !== id));
  };

  const onSubmit = async (data) => {
    setLoading(true);
    
    try {
      const formData = new FormData();
      
      // Add form fields
      formData.append('title', data.title);
      formData.append('description', data.description);
      formData.append('incidentType', data.incidentType);
      formData.append('severity', data.severity);
      formData.append('priority', data.priority);
      formData.append('infringedContent', data.infringedContent);
      formData.append('infringedUrls', JSON.stringify(infringedUrls));
      formData.append('infringerInfo', JSON.stringify({
        name: data.infringerName,
        email: data.infringerEmail,
        website: data.infringerWebsite,
        organization: data.infringerOrganization,
        contactInfo: data.infringerContact
      }));
      formData.append('tags', JSON.stringify(data.tags?.split(',').map(tag => tag.trim()).filter(tag => tag) || []));

      // Add uploaded files
      uploadedFiles.forEach(file => {
        formData.append('evidence', file.file);
      });

      const response = await axios.post('/api/incidents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Incident reported successfully');
      navigate(`/incidents/${response.data.incident._id}`);
    } catch (error) {
      console.error('Error creating incident:', error);
      toast.error(error.response?.data?.message || 'Failed to create incident');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Report New Incident</h1>
        <p className="mt-1 text-sm text-gray-500">
          Document copyright infringement, trademark violations, or other IP-related issues
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
          </div>
          <div className="card-body space-y-4">
            <div>
              <label className="form-label">Incident Title *</label>
              <input
                {...register('title', { required: 'Title is required', minLength: 5 })}
                className="form-input"
                placeholder="Brief description of the incident"
              />
              {errors.title && <p className="form-error">{errors.title.message}</p>}
            </div>

            <div>
              <label className="form-label">Description *</label>
              <textarea
                {...register('description', { required: 'Description is required', minLength: 10 })}
                className="form-textarea h-24"
                placeholder="Detailed description of the incident, including context and impact"
              />
              {errors.description && <p className="form-error">{errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="form-label">Incident Type *</label>
                <select {...register('incidentType')} className="form-select">
                  <option value="copyright_infringement">Copyright Infringement</option>
                  <option value="trademark_violation">Trademark Violation</option>
                  <option value="impersonation">Impersonation</option>
                  <option value="unauthorized_distribution">Unauthorized Distribution</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="form-label">Severity</label>
                <select {...register('severity')} className="form-select">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="form-label">Priority</label>
                <select {...register('priority')} className="form-select">
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Infringed Content */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Infringed Content</h3>
          </div>
          <div className="card-body space-y-4">
            <div>
              <label className="form-label">DSP Content Description *</label>
              <input
                {...register('infringedContent', { required: 'Content description is required' })}
                className="form-input"
                placeholder="e.g., Signing Naturally Unit 5, DawnSignPress Logo, ASL Pal Software"
              />
              {errors.infringedContent && <p className="form-error">{errors.infringedContent.message}</p>}
            </div>

            <div>
              <label className="form-label">Infringed URLs</label>
              <div className="space-y-2">
                {infringedUrls.map((url) => (
                  <div key={url.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
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
                
                <div className="flex space-x-2">
                  <input
                    type="url"
                    value={newUrl.url}
                    onChange={(e) => setNewUrl({ ...newUrl, url: e.target.value })}
                    className="form-input flex-1"
                    placeholder="https://example.com/infringing-content"
                  />
                  <input
                    type="text"
                    value={newUrl.description}
                    onChange={(e) => setNewUrl({ ...newUrl, description: e.target.value })}
                    className="form-input flex-1"
                    placeholder="Description (optional)"
                  />
                  <button
                    type="button"
                    onClick={addUrl}
                    className="btn-outline"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Infringer Information */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Infringer Information</h3>
            <p className="mt-1 text-sm text-gray-500">Information about the party infringing DSP's rights</p>
          </div>
          <div className="card-body space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="form-label">Name/Organization</label>
                <input
                  {...register('infringerName')}
                  className="form-input"
                  placeholder="Individual or organization name"
                />
              </div>

              <div>
                <label className="form-label">Email</label>
                <input
                  {...register('infringerEmail')}
                  type="email"
                  className="form-input"
                  placeholder="contact@example.com"
                />
              </div>

              <div>
                <label className="form-label">Website</label>
                <input
                  {...register('infringerWebsite')}
                  type="url"
                  className="form-input"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="form-label">Organization</label>
                <input
                  {...register('infringerOrganization')}
                  className="form-input"
                  placeholder="Company or institution name"
                />
              </div>
            </div>

            <div>
              <label className="form-label">Additional Contact Information</label>
              <textarea
                {...register('infringerContact')}
                className="form-textarea h-20"
                placeholder="Phone numbers, addresses, or other relevant contact details"
              />
            </div>
          </div>
        </div>

        {/* Evidence Upload */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Evidence</h3>
            <p className="mt-1 text-sm text-gray-500">Upload screenshots, documents, or other supporting evidence</p>
          </div>
          <div className="card-body space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      Upload evidence files
                    </span>
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.txt"
                      onChange={handleFileUpload}
                      className="sr-only"
                    />
                  </label>
                  <p className="mt-1 text-xs text-gray-500">
                    PNG, JPG, PDF, DOC, DOCX up to 10MB each
                  </p>
                </div>
              </div>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-900">Uploaded Files</h4>
                {uploadedFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{file.name}</span>
                      <span className="text-xs text-gray-500">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
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
          </div>
        </div>

        {/* Additional Information */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Additional Information</h3>
          </div>
          <div className="card-body space-y-4">
            <div>
              <label className="form-label">Tags</label>
              <input
                {...register('tags')}
                className="form-input"
                placeholder="Enter tags separated by commas (e.g., urgent, website, textbook)"
              />
              <p className="mt-1 text-xs text-gray-500">
                Use tags to help categorize and search for this incident
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/incidents')}
            className="btn-outline"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? (
              <div className="loading-spinner mr-2" />
            ) : (
              <AlertTriangle className="h-4 w-4 mr-2" />
            )}
            Report Incident
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateIncident;
