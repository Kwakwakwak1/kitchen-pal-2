import React, { ReactNode, ReactElement } from 'react';
import { PlusIcon } from './constants';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'; // Added 2xl
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl', // Added 2xl
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50 p-4">
      <div className={`relative w-full ${sizeClasses[size]} bg-white rounded-lg shadow-xl transform transition-all sm:my-8 sm:align-middle`}>
        <div className="flex items-start justify-between p-5 border-b border-gray-200 rounded-t">
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          <button
            type="button"
            className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center"
            onClick={onClose}
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success'; // Added success
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'md', leftIcon, rightIcon, className, ...props }) => {
  const baseStyles = "font-medium rounded-lg focus:outline-none focus:ring-4 transition-colors duration-150 ease-in-out inline-flex items-center justify-center";
  
  const variantStyles = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-300",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800 focus:ring-gray-200 border border-gray-300",
    danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-300",
    ghost: "bg-transparent hover:bg-gray-100 text-gray-700 focus:ring-gray-200",
    success: "bg-green-600 hover:bg-green-700 text-white focus:ring-green-300", // Added success
  };

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      type="button"
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className || ''}`}
      {...props}
    >
      {leftIcon && <span className="mr-2 -ml-1">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="ml-2 -mr-1">{rightIcon}</span>}
    </button>
  );
};


interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string; 
  error?: string;
  containerClassName?: string;
}

export const InputField: React.FC<InputFieldProps> = ({ label, id, error, className, containerClassName, ...props }) => {
  return (
    <div className={containerClassName}>
      {label && <label htmlFor={id} className="block mb-2 text-sm font-medium text-gray-700">{label}</label>}
      <input
        id={id}
        className={`bg-gray-50 border ${error ? 'border-red-500 text-red-900 placeholder-red-700 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500'} text-sm rounded-lg block w-full p-2.5 ${className || ''}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

interface TextAreaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export const TextAreaField: React.FC<TextAreaFieldProps> = ({ label, id, error, className, ...props }) => {
  return (
    <div>
      <label htmlFor={id} className="block mb-2 text-sm font-medium text-gray-700">{label}</label>
      <textarea
        id={id}
        rows={4}
        className={`bg-gray-50 border ${error ? 'border-red-500 text-red-900 placeholder-red-700 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500'} text-sm rounded-lg block w-full p-2.5 ${className || ''}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};


interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string; // Made label optional
  error?: string;
  options: Array<{ value: string | number; label: string }>;
  containerClassName?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({ label, id, error, options, className, containerClassName, ...props }) => {
  return (
    <div className={containerClassName}>
      {label && <label htmlFor={id} className="block mb-2 text-sm font-medium text-gray-700">{label}</label>}
      <select
        id={id}
        className={`bg-gray-50 border ${error ? 'border-red-500 text-red-900 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500'} text-sm rounded-lg block w-full p-2.5 ${className || ''}`}
        {...props}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

interface CheckboxFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string | ReactNode;
  error?: string;
  containerClassName?: string;
}

export const CheckboxField: React.FC<CheckboxFieldProps> = ({ label, id, error, className, containerClassName, ...props }) => {
  return (
    <div className={`flex items-center ${containerClassName || ''}`}>
      <input
        id={id}
        type="checkbox"
        className={`w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 ${className || ''}`}
        {...props}
      />
      <label htmlFor={id} className="ml-2 text-sm font-medium text-gray-700">{label}</label>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};


interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}
export const Card: React.FC<CardProps> = ({ children, className, onClick }) => {
  return (
    <div 
      className={`bg-white shadow-lg rounded-lg p-4 md:p-6 hover:shadow-xl transition-shadow duration-200 ${onClick ? 'cursor-pointer' : ''} ${className || ''}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({ value, onChange, placeholder = "Search...", className }) => {
  return (
    <div className={`relative ${className || ''}`}>
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <svg className="w-5 h-5 text-gray-500" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"></path></svg>
      </div>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full p-3 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
        placeholder={placeholder}
      />
    </div>
  );
};

interface EmptyStateProps {
  icon: ReactElement<{ className?: string }>; 
  title: string;
  message: string;
  actionButton?: ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, message, actionButton }) => {
  return (
    <div className="text-center py-12">
      <div className="flex justify-center items-center text-gray-400 mb-4">
        {React.cloneElement(icon, { className: "w-16 h-16" })}
      </div>
      <h3 className="text-xl font-semibold text-gray-700 mb-2">{title}</h3>
      <p className="text-gray-500 mb-4">{message}</p>
      {actionButton}
    </div>
  );
};


export const AddItemButton: React.FC<{onClick: () => void, text: string}> = ({onClick, text}) => (
    <Button
        onClick={onClick}
        variant="primary"
        leftIcon={<PlusIcon className="w-5 h-5" />}
        className="fixed bottom-6 right-6 shadow-lg z-20"
      >
        {text}
      </Button>
);

interface AlertProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({ message, type = 'info', onClose }) => {
  const baseClasses = "p-4 mb-4 text-sm rounded-lg";
  const typeClasses = {
    success: "bg-green-100 text-green-700",
    error: "bg-red-100 text-red-700",
    warning: "bg-yellow-100 text-yellow-700",
    info: "bg-blue-100 text-blue-700",
  };

  return (
    <div className={`${baseClasses} ${typeClasses[type]} flex justify-between items-center`} role="alert">
      <span>{message}</span>
      {onClose && (
        <button
          type="button"
          className="-mx-1.5 -my-1.5 p-1.5 inline-flex h-8 w-8 rounded-lg focus:ring-2"
          onClick={onClose}
          aria-label="Close"
        >
          <span className="sr-only">Close</span>
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
          </svg>
        </button>
      )}
    </div>
  );
};

// Export ConfirmationModal from its file
export { default as ConfirmationModal } from './src/components/ConfirmationModal';

// Bottom Action Bar for consistent search and action button layout
interface BottomActionBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  actionButton?: React.ReactNode;
}

export const BottomActionBar: React.FC<BottomActionBarProps> = ({ 
  searchValue, 
  onSearchChange, 
  searchPlaceholder = "Search...", 
  actionButton 
}) => {
  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white rounded-full shadow-lg border border-gray-200 p-2 flex items-center space-x-3 min-w-[320px]">
        <div className="flex-1">
          <SearchInput 
            value={searchValue} 
            onChange={onSearchChange} 
            placeholder={searchPlaceholder}
            className="rounded-full"
          />
        </div>
        {actionButton && (
          <div className="flex-shrink-0">
            {actionButton}
          </div>
        )}
      </div>
    </div>
  );
};

