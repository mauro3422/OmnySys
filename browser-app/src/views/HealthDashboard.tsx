import { useMemo } from 'react';
import type { DbStats, FileInfo } from '../types';

interface Props {
  stats: DbStats | null;
  health: any;
  dataSource: string;
  files?: FileInfo[];
  onFileSelect?: (filePath: string) => void;
}

function Gauge({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="gauge">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#313244" strokeWidth="8" />
        <circle cx="50" cy="50" r={radius} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
        <text x="50" y="46" textAnchor="middle" fill="#cdd6f4" fontSize="18" fontWeight="700">
          {typeof value === 'number' ? (value > 999 ? `${(value/1000).toFixed(1)}k` : Math.round(value)) : value}
        </text>
        <text x="50" y="62" textAnchor="middle" fill="#cdd6f4" fontSize="9" opacity="0.6">
          / {max > 999 ? `${(max/1000).toFixed(0)}k` : max}
        </text>
      </svg>
      <div className="gauge-label">{label}</div>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: string; label: string; value: string | number; sub?: string }) {
  return (
    <div className="stat-card">
      <div className="stat-card-icon">{icon}</div>
      <div className="stat-card-body">
        <div className="stat-card-value">{value}</div>
        <div className="stat-card-label">{label}</div>
        {sub && <div className="stat-card-sub">{sub}</div>}
      </div>
    </div>
  );
}

export function HealthDashboard({ stats, health, dataSource, files, onFileSelect }: Props) {
  const isReady = health?.ready;
  const isHealthy = health?.status === 'healthy';

  const topRiskFiles = useMemo(() => {
    if (!files) return [];
    return [...files]
      .filter(f => f.riskScore && f.riskScore > 0)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 8);
  }, [files]);

  return (
    <div className="health-dashboard">
      {/* Data Source indicator */}
      <div className="health-status-bar">
        <div className={`status-dot ${['mcp', 'live', 'sqlite'].includes(dataSource) ? 'healthy' : dataSource === 'demo' ? 'warning' : 'error'}`} />
        <span>
          {['mcp', 'live', 'sqlite'].includes(dataSource) ? 'Connected to live OmnySystem DB' :
           dataSource === 'demo' ? 'Demo mode — upload omnysys.db for real data' :
           'No data source detected'}
        </span>
        <span className="status-service">
          {dataSource === 'mcp' ? 'SQLite via MCP' : dataSource === 'demo' ? 'Demo Data' : '—'}
        </span>
      </div>

      {/* Gauges */}
      <div className="gauges-row">
        <Gauge value={stats?.totalAtoms || 0} max={20000} label="Atoms" color="#89b4fa" />
        <Gauge value={stats?.totalFiles || 0} max={5000} label="Files" color="#a6e3a1" />
        <Gauge value={stats?.avgComplexity || 0} max={15} label="Avg CC" color={
          (stats?.avgComplexity || 0) > 10 ? '#ff4757' :
          (stats?.avgComplexity || 0) > 5 ? '#ffa502' : '#2ed573'
        } />
        <Gauge value={stats?.totalRelations || 0} max={15000} label="Relations" color="#f5c2e7" />
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        <StatCard icon="⚛️" label="Total Atoms" value={stats?.totalAtoms?.toLocaleString() || '—'} />
        <StatCard icon="📁" label="Analyzed Files" value={stats?.totalFiles?.toLocaleString() || '—'} />
        <StatCard icon="🔗" label="Relations" value={stats?.totalRelations?.toLocaleString() || '—'} />
        <StatCard icon="📡" label="Events" value={stats?.totalEvents?.toLocaleString() || '—'} />
        <StatCard icon="🧠" label="Avg Complexity" value={stats?.avgComplexity || '—'}
          sub={`Max: ${stats?.maxComplexity || '—'}`} />
        <StatCard icon="🏥" label="Data Source" value={dataSource}
          sub={health?.transport || ''} />
      </div>

      {health?.background && (
        <div className="health-section">
          <h3>Background Analysis</h3>
          <div className="stats-grid">
            <StatCard icon="🔄" label="Phase 2 Pending"
              value={health.background.phase2PendingFiles || 0}
              sub="files awaiting deep analysis" />
            <StatCard icon="🤝" label="Societies"
              value={health.background.societiesCount || 0}
              sub="functional clusters" />
          </div>
        </div>
      )}

      {topRiskFiles.length > 0 && (
        <div className="health-section" style={{ marginTop: '32px' }}>
          <h3 style={{ borderBottomColor: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔴 Top High Risk Files
            <span style={{ fontSize: '10px', background: 'rgba(243, 139, 168, 0.2)', color: 'var(--accent-red)', padding: '2px 8px', borderRadius: '10px' }}>Requires Action</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {topRiskFiles.map(f => (
              <div 
                key={f.path} 
                onClick={() => onFileSelect && onFileSelect(f.path)}
                style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                  padding: '12px 16px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s ease',
                  borderLeft: `4px solid ${f.riskLevel === 'critical' || f.riskLevel === 'high' ? 'var(--accent-red)' : 'var(--accent-peach)'}`
                }}
                onMouseOver={e => e.currentTarget.style.borderLeftColor = 'var(--accent-blue)'}
                onMouseOut={e => e.currentTarget.style.borderLeftColor = f.riskLevel === 'critical' || f.riskLevel === 'high' ? 'var(--accent-red)' : 'var(--accent-peach)'}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <strong style={{ fontSize: '14px', color: 'var(--fg-text)' }}>{f.path.split('/').pop()}</strong>
                  <span style={{ fontSize: '11px', color: 'var(--fg-overlay)' }}>{f.path}</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span className="stat-chip" style={{ background: 'rgba(250, 179, 135, 0.1)', color: 'var(--accent-peach)' }}>
                    Complexity: {f.totalComplexity}
                  </span>
                  <span className="stat-chip" style={{ background: 'rgba(243, 139, 168, 0.1)', color: 'var(--accent-red)' }}>
                    Risk: {Math.round(f.riskScore)}
                  </span>
                  <span style={{ color: 'var(--accent-blue)', opacity: 0.5 }}>→</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
