import React from 'react';

const LoadingSpinner = ({ size = 'default', className = '' }) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    default: 'h-6 w-6',
    large: 'h-8 w-8'
  };

  return (
    <div className={`loading-spinner ${sizeClasses[size]} ${className}`} />
  );
};

export default LoadingSpinner;
