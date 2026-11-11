import React from 'react';

const Alert = ({ children, variant = 'default', className = '' }) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'destructive':
        return 'bg-red-900/20 border-red-500/50 text-red-300';
      case 'success':
        return 'bg-green-900/20 border-green-500/50 text-green-300';
      case 'warning':
        return 'bg-orange-900/20 border-orange-500/50 text-orange-300';
      default:
        return 'bg-gray-900/20 border-gray-500/50 text-gray-300';
    }
  };

  return (
    <div className={`hud-panel p-4 ${getVariantClasses()} ${className}`}>
      {children}
    </div>
  );
};

const AlertDescription = ({ children, className = '' }) => {
  return (
    <div className={`text-sm font-mono ${className}`}>
      {children}
    </div>
  );
};

export { Alert, AlertDescription };