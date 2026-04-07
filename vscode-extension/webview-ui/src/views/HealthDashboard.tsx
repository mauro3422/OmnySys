import type { DbStats } from '../types';

interface Props {
  stats: DbStats | null;
  health: any;
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
        <circle
          cx="50" cy="50" r={radius} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
        <text x="50" y="46" textAnchor="middle" fill="var(--node-fg, #cdd6f4)" fontSize="18" fontWeight="700">
          {Math.round(value)}
        </text>
        <text x="50" y="62" textAnchor="middle" fill="var(--node-fg, #cdd6f4)" fontSize="9" opacity="0.6">
          / {max}
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

export function HealthDashboard({ stats, health }: Props) {
  const isReady = health?.ready;
  const isHealthy = health?.status === 'healthy';

  return (
    <div className="health-dashboard">
      {/* Connection Status */}
      <div className="health-status-bar">
        <div className={`status-dot ${isHealthy ? 'healthy' : isReady === false ? 'error' : 'warning'}`} />
        <span>
          {isHealthy ? 'Connected to OmnySystem' : health?.status === 'starting' ? 'Starting...' : 'Disconnected'}
        </span>
        {health?.service && <span className="status-service">{health.service}</span>}
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
        <StatCard
          icon="🧠"
          label="Avg Complexity"
          value={stats?.avgComplexity || '—'}
          sub={`Max: ${stats?.maxComplexity || '—'}`}
        />
        <StatCard
          icon="🏥"
          label="Daemon Status"
          value={health?.status || 'unknown'}
          sub={health?.transport || ''}
        />
      </div>

      {/* Background info */}
      {health?.background && (
        <div className="health-section">
          <h3>Background Analysis</h3>
          <div className="stats-grid">
            <StatCard
              icon="🔄"
              label="Phase 2 Pending"
              value={health.background.phase2PendingFiles || 0}
              sub="files awaiting deep analysis"
            />
            <StatCard
              icon="🤝"
              label="Societies"
              value={health.background.societiesCount || 0}
              sub="functional clusters"
            />
          </div>
        </div>
      )}
    </div>
  );
}
