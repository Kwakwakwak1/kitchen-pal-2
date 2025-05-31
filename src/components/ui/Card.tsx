import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  const baseClasses = 'bg-white shadow rounded-lg border border-gray-200';
  const classes = `${baseClasses} ${className}`;

  return (
    <div className={classes}>
      {children}
    </div>
  );
}; 