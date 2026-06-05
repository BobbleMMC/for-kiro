import { useState, useEffect } from 'react';
import { useProjectStore } from './stores/projectStore';
import Layout from './components/layout/Layout';
import Dashboard from './components/pages/Dashboard';
import { Workspace } from './components/pages/Workspace';
import './App.css';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'workspace'>('dashboard');
  const { currentProject } = useProjectStore();

  // Auto-navigate to workspace when project selected
  useEffect(() => {
    if (currentProject) {
      setCurrentPage('workspace');
    }
  }, [currentProject]);

  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {currentPage === 'dashboard' ? (
        <Dashboard onProjectSelect={() => setCurrentPage('workspace')} />
      ) : (
        <Workspace />
      )}
    </Layout>
  );
}
