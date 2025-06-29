/**
 * Loading Spinner Component
 * 
 * Animated spinner for loading states
 * Customizable size and color
 */

import React from 'react';

export interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'white' | 'current';
}

const getSizeClasses = (size: LoadingSpinnerProps['size']): string => {
  switch (size) {
    case 'sm':
      return 'w-4 h-4';
    case 'md':
      return 'w-6 h-6';
    case 'lg':
      return 'w-8 h-8';
    default:
      return 'w-6 h-6';
  }
};

const getColorClasses = (color: LoadingSpinnerProps['color']): string => {
  switch (color) {
    case 'primary':
      return 'text-blue-600';
    case 'secondary':
      return 'text-gray-600';
    case 'white':
      return 'text-white';
    case 'current':
      return 'text-current';
    default:
      return 'text-blue-600';
  }
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  className = '',
  ...props
}) => {
  return (
    <div
      {...props}
      className={`
        inline-block animate-spin rounded-full border-2 border-solid border-current border-r-transparent
        ${getSizeClasses(size)}
        ${getColorClasses(color)}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default LoadingSpinner;