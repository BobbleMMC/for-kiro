import { useState, useEffect } from 'react';
import { useProjectStore } from './stores/projectStore';
import { useDatabase } from './hooks/useDatabase';
import Layout from './components/layout/Layout';
import Dashboard from './components/pages/Dashboard';
import Workspace from './components/pages/Workspace';
import './App.css';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'workspace'>('dashboard');
  const { currentProject } = useProjectStore();
  const { isReady, isLoading, error, isSeeding } = useDatabase();

  // Auto-navigate to workspace when project selected
  useEffect(() => {
    if (currentProject) {
      setCurrentPage('workspace');
    }
  }, [currentProject]);

  // Database loading state
  if (isLoading || !isReady) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-white mb-2">
            {isSeeding ? 'Setting up your mod workspace...' : 'Loading database...'}
          </h2>
          <p className="text-gray-400 text-sm">
            {isSeeding
              ? 'Creating default blocks, items, recipes, and entities'
              : 'Connecting to local database'}
          </p>
        </div>
      </div>
    );
  }

  // Database error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-5xl mb-4">&#9888;</div>
          <h2 className="text-xl font-semibold text-white mb-2">Database Error</h2>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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
