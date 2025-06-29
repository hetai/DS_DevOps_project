/**
 * Alert Component
 * 
 * Displays important messages with different severity levels
 * Supports various alert types with appropriate styling
 */

import React from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'warning' | 'success' | 'info';
  children: React.ReactNode;
}

const getVariantClasses = (variant: AlertProps['variant']): string => {
  switch (variant) {
    case 'destructive':
      return 'bg-red-50 border-red-200 text-red-800';
    case 'warning':
      return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    case 'success':
      return 'bg-green-50 border-green-200 text-green-800';
    case 'info':
      return 'bg-blue-50 border-blue-200 text-blue-800';
    case 'default':
    default:
      return 'bg-gray-50 border-gray-200 text-gray-800';
  }
};

const getVariantIcon = (variant: AlertProps['variant']) => {
  switch (variant) {
    case 'destructive':
      return <XCircle className="w-4 h-4" />;
    case 'warning':
      return <AlertTriangle className="w-4 h-4" />;
    case 'success':
      return <CheckCircle className="w-4 h-4" />;
    case 'info':
      return <Info className="w-4 h-4" />;
    case 'default':
    default:
      return <Info className="w-4 h-4" />;
  }
};

export const Alert: React.FC<AlertProps> = ({
  variant = 'default',
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      {...props}
      className={`
        relative w-full rounded-lg border p-4
        ${getVariantClasses(variant)}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      role="alert"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-3">
          {getVariantIcon(variant)}
        </div>
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Alert;