import type { FC, ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import MainContent from './MainContent';

interface LayoutProps {
  children: ReactNode;
  currentPage: 'dashboard' | 'workspace';
  onPageChange: (page: 'dashboard' | 'workspace') => void;
}

const Layout: FC<LayoutProps> = ({ children, currentPage, onPageChange }) => {
  return (
    <div className="flex flex-col w-full h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <Header currentPage={currentPage} onPageChange={onPageChange} />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar currentPage={currentPage} onPageChange={onPageChange} />

        {/* Main Content */}
        <MainContent>
          {children}
        </MainContent>
      </div>
    </div>
  );
};

export default Layout;
