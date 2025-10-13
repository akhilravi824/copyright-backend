import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const accessToken = searchParams.get('access_token');
        const type = searchParams.get('type');
        const invitationToken = searchParams.get('invitation_token');

        console.log('🔄 Auth callback received:', { accessToken, type, invitationToken });

        if (type === 'invite' && invitationToken) {
          // This is a Supabase Auth invitation - redirect to our custom invitation page
          console.log('🔄 Redirecting to custom invitation page with token:', invitationToken);
          navigate(`/invite/${invitationToken}`, { replace: true });
          return;
        }

        if (accessToken) {
          // This is a regular auth callback - try to login
          console.log('🔄 Attempting to login with access token');
          
          // For now, redirect to login page
          // In a full implementation, you'd decode the JWT and login the user
          navigate('/login', { replace: true });
          return;
        }

        // No valid tokens - redirect to login
        console.log('🔄 No valid tokens found, redirecting to login');
        navigate('/login', { replace: true });

      } catch (error) {
        console.error('❌ Auth callback error:', error);
        navigate('/login', { replace: true });
      }
    };

    handleCallback();
  }, [searchParams, navigate, login]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Processing authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallback;

