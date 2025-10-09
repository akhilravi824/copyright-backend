import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'react-query';
import api from '../api/api';
import { useAuth } from '../contexts/AuthContext';
import {
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  User,
  Lock,
  Phone,
  AlertCircle
} from 'lucide-react';

const InviteAcceptance = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    password: '',
    confirm_password: '',
    phone: ''
  });
  const [errors, setErrors] = useState({});

  // Fetch invitation details
  const { data: invitationData, isLoading, error } = useQuery(
    ['invitation', token],
    () => api.get(`/api/invitations/token/${token}`).then(res => res.data),
    {
      enabled: !!token,
      retry: false
    }
  );

  // Accept invitation mutation
  const acceptInvitationMutation = useMutation(
    (userData) => api.post(`/api/invitations/${token}/accept`, userData),
    {
      onSuccess: (response) => {
        // Login the user automatically
        login(response.data.token, response.data.user);
        navigate('/dashboard');
      },
      onError: (error) => {
        console.error('Accept invitation error:', error);
        setErrors({ submit: error.response?.data?.message || 'Failed to create account' });
      }
    }
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      acceptInvitationMutation.mutate({
        first_name: formData.first_name,
        last_name: formData.last_name,
        password: formData.password,
        phone: formData.phone
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const isExpired = error.response?.status === 410;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isExpired ? 'Invitation Expired' : 'Invalid Invitation'}
          </h2>
          <p className="text-gray-600 mb-6">
            {isExpired 
              ? 'This invitation has expired. Please contact your administrator for a new invitation.'
              : 'This invitation link is invalid or has already been used.'
            }
          </p>
          <button
            onClick={() => navigate('/login')}
            className="btn-primary"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const invitation = invitationData?.invitation;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Complete Your Registration
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            You've been invited to join DSP Brand Protection Platform
          </p>
        </div>

        {/* Invitation Details */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <CheckCircle className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-sm font-medium text-blue-900">Invitation Details</h3>
          </div>
          <div className="text-sm text-blue-800 space-y-1">
            <p><strong>Email:</strong> {invitation?.email}</p>
            <p><strong>Role:</strong> {invitation?.role}</p>
            {invitation?.department && <p><strong>Department:</strong> {invitation.department}</p>}
            {invitation?.job_title && <p><strong>Job Title:</strong> {invitation.job_title}</p>}
            <p><strong>Invited by:</strong> {invitation?.invited_by?.first_name} {invitation?.invited_by?.last_name}</p>
          </div>
          {invitation?.custom_message && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Message:</strong> {invitation.custom_message}
              </p>
            </div>
          )}
        </div>

        {/* Registration Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                  First Name *
                </label>
                <div className="mt-1 relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="first_name"
                    name="first_name"
                    type="text"
                    required
                    className={`input pl-10 ${errors.first_name ? 'border-red-500' : ''}`}
                    placeholder="John"
                    value={formData.first_name}
                    onChange={handleInputChange}
                  />
                </div>
                {errors.first_name && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.first_name}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                  Last Name *
                </label>
                <div className="mt-1 relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="last_name"
                    name="last_name"
                    type="text"
                    required
                    className={`input pl-10 ${errors.last_name ? 'border-red-500' : ''}`}
                    placeholder="Doe"
                    value={formData.last_name}
                    onChange={handleInputChange}
                  />
                </div>
                {errors.last_name && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.last_name}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <div className="mt-1 relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className="input pl-10"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password *
              </label>
              <div className="mt-1 relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className={`input pl-10 ${errors.password ? 'border-red-500' : ''}`}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange}
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.password}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700">
                Confirm Password *
              </label>
              <div className="mt-1 relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  required
                  className={`input pl-10 ${errors.confirm_password ? 'border-red-500' : ''}`}
                  placeholder="Confirm your password"
                  value={formData.confirm_password}
                  onChange={handleInputChange}
                />
              </div>
              {errors.confirm_password && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.confirm_password}
                </p>
              )}
            </div>
          </div>

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <XCircle className="h-5 w-5 text-red-500 mr-2" />
                <p className="text-sm text-red-800">{errors.submit}</p>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={acceptInvitationMutation.isLoading}
              className="w-full btn-primary"
            >
              {acceptInvitationMutation.isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Account...
                </div>
              ) : (
                'Create Account'
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                Sign in
              </button>
            </p>
          </div>
        </form>

        {/* Expiration Warning */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-yellow-600 mr-2" />
            <p className="text-sm text-yellow-800">
              This invitation expires on {new Date(invitation?.expires_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteAcceptance;
