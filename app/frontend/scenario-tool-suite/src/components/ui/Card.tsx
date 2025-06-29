/**
 * Card Component
 * 
 * Reusable card component for content containers
 * Provides consistent styling and spacing
 */

import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'outlined' | 'elevated';
}

const getVariantClasses = (variant: CardProps['variant']): string => {
  switch (variant) {
    case 'outlined':
      return 'border border-gray-200 bg-white';
    case 'elevated':
      return 'border border-gray-200 bg-white shadow-lg';
    case 'default':
    default:
      return 'border border-gray-200 bg-white shadow-sm';
  }
};

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className = '',
  ...props
}) => {
  return (
    <div
      {...props}
      className={`
        rounded-lg
        ${getVariantClasses(variant)}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      {children}
    </div>
  );
};

export default Card;