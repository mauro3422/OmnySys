import { useState, useCallback } from 'react';
import { DependencyGraph } from './views/DependencyGraph';
import { AtomExplorer } from './views/AtomExplorer';
import { HealthDashboard } from './views/HealthDashboard';
import { FileTree } from './views/FileTree';
import { useOmnyData } from './hooks/useOmnyData';
import type { ViewMode } from './types';

type ViewPane = 'internals' | 'architecture';

export default function App() {
  const [activePane, setActivePane] = useState<ViewPane>('internals');
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  const data = useOmnyData();

  const handleFileSelect = useCallback((filePath: string, symbolName?: string) => {
    if (filePath && filePath !== data.activeFilePath) {
      setNavigationHistory(prev => {
        if (prev[prev.length - 1] === filePath) return prev;
        const existingIndex = prev.indexOf(filePath);
        if (existingIndex !== -1) {
          return prev.slice(0, existingIndex + 1);
        }
        const newHistory = data.activeFilePath ? [...prev, data.activeFilePath] : prev;
        return newHistory.slice(-5);
      });
    }
    
    data.selectFile(filePath, symbolName);
    if (filePath) {
      setActivePane('internals');
    }
  }, [data.selectFile, data.activeFilePath]);

  const handleHomeClick = () => {
    setNavigationHistory([]);
    data.selectFile('');
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="app-logo">
          <span className="logo-icon">◉</span>
          <span className="logo-text">OmnySystem Explorer</span>
        </div>
        <nav className="app-tabs">
          <button
            className={`tab ${!data.activeFilePath ? 'active' : ''}`}
            onClick={handleHomeClick}
          >
            <span className="tab-icon">🏥</span>
            <span className="tab-label">Health & Home</span>
          </button>
        </nav>
        <div className="app-stats">
          {data.stats && (
            <>
              <span>⚛ {data.stats.totalAtoms.toLocaleString()}</span>
              <span>📁 {data.stats.totalFiles.toLocaleString()}</span>
            </>
          )}
          <span className={`data-source-badge ${data.dataSource}`}>
            {data.dataSource === 'live' ? '🟢 Live DB' : data.dataSource === 'demo' ? '🟡 Demo' : '⚪ —'}
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="app-content" style={{ display: 'flex', flexDirection: 'row' }}>
        {(data.loading && data.files.length === 0) ? (
          <div className="loading-state" style={{ width: '100%' }}>
            <div className="spinner" />
            <p>Connecting to OmnySystem...</p>
          </div>
        ) : (
          <>
            <aside style={{ width: '300px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0, backgroundColor: 'var(--bg-surface)' }}>
              <FileTree
                files={data.files}
                selectedFile={data.activeFilePath}
                onFileSelect={handleFileSelect}
              />
            </aside>
            <section style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
              {!data.activeFilePath ? (
                <div style={{ position: 'absolute', inset: 0, display: 'block', overflow: 'auto' }}>
                  <HealthDashboard 
                    stats={data.stats} 
                    health={data.health} 
                    dataSource={data.dataSource}
                    files={data.files}
                    onFileSelect={handleFileSelect}
                  />
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', padding: '8px 16px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', gap: '16px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, gap: '4px' }}>
                      {/* Breadcrumbs Navigation */}
                      {navigationHistory.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--fg-overlay)', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {navigationHistory.map((histPath, i) => (
                            <div key={`hist-${histPath}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span 
                                onClick={() => handleFileSelect(histPath)}
                                style={{ cursor: 'pointer', transition: 'color 0.2s', textDecoration: 'underline' }}
                                onMouseOver={e => e.currentTarget.style.color = 'var(--accent-blue)'}
                                onMouseOut={e => e.currentTarget.style.color = 'var(--fg-overlay)'}
                                title={histPath}
                              >
                                {histPath.split('/').pop()}
                              </span>
                              <span>›</span>
                            </div>
                          ))}
                          <strong style={{ color: 'var(--fg-text)' }}>{data.activeFilePath.split('/').pop()}</strong>
                        </div>
                      )}

                      {/* Main File Header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>📄</span>
                        <strong style={{ fontSize: '14px', color: 'var(--fg-text)' }}>{data.activeFilePath.split('/').pop()}</strong>
                        <span style={{ fontSize: '12px', color: 'var(--fg-overlay)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', opacity: navigationHistory.length > 0 ? 0 : 1 }}>
                          {data.activeFilePath}
                        </span>
                        {data.activeFileAtoms && (
                          <div style={{ display: 'flex', gap: '6px', marginLeft: '12px' }}>
                            <span className="stat-chip">Functions: {data.activeFileAtoms.length}</span>
                            <span className="stat-chip">Complexity: {data.activeFileAtoms.reduce((s, a) => s + a.complexity, 0)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <button 
                        className={`tab ${activePane === 'internals' ? 'active' : ''}`}
                        onClick={() => setActivePane('internals')}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        <span className="tab-icon">⚙️</span>
                        <span className="tab-label">Code Internals</span>
                      </button>
                      <button 
                        className={`tab ${activePane === 'architecture' ? 'active' : ''}`}
                        onClick={() => setActivePane('architecture')}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        <span className="tab-icon">🪐</span>
                        <span className="tab-label">Architecture</span>
                      </button>
                    </div>
                  </div>
                  <div style={{ flex: 1, position: 'relative' }}>
                    {activePane === 'internals' && (
                      <div style={{ position: 'absolute', inset: 0 }}>
                        <AtomExplorer
                          key={data.activeFilePath}
                          atoms={data.activeFileAtoms}
                          relations={data.activeFileRelations}
                          filePath={data.activeFilePath}
                          onFileSelect={handleFileSelect}
                          activeSymbolName={data.activeSymbolName}
                        />
                      </div>
                    )}
                    {activePane === 'architecture' && (
                      <div style={{ position: 'absolute', inset: 0 }}>
                        <DependencyGraph
                          files={data.files}
                          dependencies={data.dependencies}
                          selectedFile={data.activeFilePath}
                          onFileSelect={handleFileSelect}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
