import { useState, useCallback } from 'react';
import { DependencyGraph } from './views/DependencyGraph';
import { AtomExplorer } from './views/AtomExplorer';
import { HealthDashboard } from './views/HealthDashboard';
import { useOmnyData } from './hooks/useOmnyData';
import { useVsCode } from './hooks/useVsCode';
import type { ViewMode } from './types';
import './App.css';

const tabs: { id: ViewMode; label: string; icon: string }[] = [
  { id: 'graph', label: 'Dependencies', icon: '🔗' },
  { id: 'atoms', label: 'Atoms', icon: '⚛️' },
  { id: 'health', label: 'Health', icon: '🏥' },
];

export default function App() {
  const [activeView, setActiveView] = useState<ViewMode>('graph');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const data = useOmnyData();
  const { requestFileAtoms } = useVsCode();

  const handleFileSelect = useCallback((filePath: string) => {
    setSelectedFile(filePath);
    requestFileAtoms(filePath);
    setActiveView('atoms');
  }, [requestFileAtoms]);

  // When activeFile changes from VS Code, auto-show it
  const effectiveFilePath = data.activeFilePath || selectedFile;

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="app-logo">
          <span className="logo-icon">◉</span>
          <span className="logo-text">OmnySystem Explorer</span>
        </div>
        <nav className="app-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab ${activeView === tab.id ? 'active' : ''}`}
              onClick={() => setActiveView(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
              {tab.id === 'atoms' && effectiveFilePath && (
                <span className="tab-badge">{effectiveFilePath.split('/').pop()}</span>
              )}
            </button>
          ))}
        </nav>
        {data.stats && (
          <div className="app-stats">
            <span>⚛ {data.stats.totalAtoms.toLocaleString()}</span>
            <span>📁 {data.stats.totalFiles.toLocaleString()}</span>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="app-content">
        {data.loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Connecting to OmnySystem...</p>
          </div>
        ) : data.error ? (
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h3>Connection Error</h3>
            <p>{data.error}</p>
          </div>
        ) : (
          <>
            <div className={`view-panel ${activeView === 'graph' ? 'active' : ''}`}>
              <DependencyGraph
                files={data.files}
                dependencies={data.dependencies}
                onFileSelect={handleFileSelect}
              />
            </div>
            <div className={`view-panel ${activeView === 'atoms' ? 'active' : ''}`}>
              <AtomExplorer
                atoms={data.activeFileAtoms}
                relations={data.activeFileRelations}
                filePath={effectiveFilePath}
              />
            </div>
            <div className={`view-panel ${activeView === 'health' ? 'active' : ''}`}>
              <HealthDashboard stats={data.stats} health={data.health} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
