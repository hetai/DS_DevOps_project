/**
 * Button Component
 * 
 * Reusable button component with multiple variants and sizes
 * Supports loading states and disabled states
 */

import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

const getVariantClasses = (variant: ButtonProps['variant']): string => {
  switch (variant) {
    case 'primary':
      return 'bg-blue-600 hover:bg-blue-700 text-white border-transparent';
    case 'secondary':
      return 'bg-gray-600 hover:bg-gray-700 text-white border-transparent';
    case 'outline':
      return 'bg-transparent hover:bg-gray-50 text-gray-900 border-gray-300';
    case 'ghost':
      return 'bg-transparent hover:bg-gray-100 text-gray-900 border-transparent';
    case 'destructive':
      return 'bg-red-600 hover:bg-red-700 text-white border-transparent';
    default:
      return 'bg-blue-600 hover:bg-blue-700 text-white border-transparent';
  }
};

const getSizeClasses = (size: ButtonProps['size']): string => {
  switch (size) {
    case 'sm':
      return 'px-3 py-1.5 text-sm';
    case 'md':
      return 'px-4 py-2 text-sm';
    case 'lg':
      return 'px-6 py-3 text-base';
    default:
      return 'px-4 py-2 text-sm';
  }
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}) => {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center
        font-medium rounded-md border
        transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${getVariantClasses(variant)}
        ${getSizeClasses(size)}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      {loading && (
        <LoadingSpinner className="w-4 h-4 mr-2" />
      )}
      {children}
    </button>
  );
};

export default Button;