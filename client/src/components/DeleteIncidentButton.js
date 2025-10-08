import React, { useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import toast from 'react-hot-toast';
import { Trash2, AlertTriangle } from 'lucide-react';

const DeleteIncidentButton = ({ incident, onSuccess, variant = 'button' }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');

  const deleteMutation = useMutation(
    () => api.post(`/api/incidents/${incident.id}/delete`, { 
      userId: user.id, 
      reason: reason || undefined 
    }),
    {
      onSuccess: () => {
        toast.success('Incident deleted successfully');
        queryClient.invalidateQueries('incidents');
        queryClient.invalidateQueries('cases');
        queryClient.invalidateQueries('dashboard-stats');
        setShowModal(false);
        if (onSuccess) {
          onSuccess();
        } else {
          // If no custom handler, navigate to incidents page
          navigate('/incidents');
        }
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to delete incident');
      },
    }
  );

  const handleDelete = () => {
    setShowModal(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate();
  };

  // Only show for admin and manager
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    return null;
  }

  // Icon button variant (for tables/lists)
  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={handleDelete}
          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
          title="Delete incident"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        {showModal && (
          <DeleteConfirmationModal
            incident={incident}
            reason={reason}
            setReason={setReason}
            onConfirm={confirmDelete}
            onCancel={() => setShowModal(false)}
            isLoading={deleteMutation.isLoading}
          />
        )}
      </>
    );
  }

  // Full button variant (for detail pages)
  return (
    <>
      <button
        onClick={handleDelete}
        className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Delete Incident
      </button>
      {showModal && (
        <DeleteConfirmationModal
          incident={incident}
          reason={reason}
          setReason={setReason}
          onConfirm={confirmDelete}
          onCancel={() => setShowModal(false)}
          isLoading={deleteMutation.isLoading}
        />
      )}
    </>
  );
};

const DeleteConfirmationModal = ({ incident, reason, setReason, onConfirm, onCancel, isLoading }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">
            Delete Incident
          </h3>
          <p className="text-gray-600 text-center mb-4">
            Are you sure you want to delete this incident? It will be moved to the deleted incidents archive.
          </p>
          
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <p className="text-sm font-medium text-gray-900 mb-1">
              {incident.caseNumber}
            </p>
            <p className="text-sm text-gray-600">{incident.title}</p>
          </div>

          <div className="mb-6">
            <label htmlFor="delete-reason" className="block text-sm font-medium text-gray-700 mb-2">
              Reason for deletion (optional)
            </label>
            <textarea
              id="delete-reason"
              rows="3"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Enter reason for deleting this incident..."
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteIncidentButton;

