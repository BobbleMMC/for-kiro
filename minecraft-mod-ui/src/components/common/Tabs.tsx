import React, { type ReactNode } from 'react';

export const Tabs: React.FC<{ children: ReactNode }> = ({ children }) => (
  <div>{children}</div>
);

export const TabsList: React.FC<{ children: ReactNode }> = ({ children }) => (
  <div className="flex gap-2 border-b border-gray-300 dark:border-gray-600">
    {children}
  </div>
);

export const TabsTrigger: React.FC<{
  value: string;
  children: ReactNode;
  onClick?: () => void;
  isActive?: boolean;
}> = ({ children, onClick, isActive }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 font-medium transition ${
      isActive
        ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
    }`}
  >
    {children}
  </button>
);

export const TabsContent: React.FC<{
  value: string;
  children: ReactNode;
}> = ({ children }) => <div>{children}</div>;
