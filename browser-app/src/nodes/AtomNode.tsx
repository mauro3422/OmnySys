import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

interface AtomNodeData {
  label: string;
  atomType: string;
  complexity: number;
  fragility: number;
  isExported: boolean;
  isAsync: boolean;
  archetype: string;
  centralityClass: string;
  linesOfCode: number;
  inDegree: number;
  outDegree: number;
  internalInDegree?: number;
  isOrchestrator?: boolean;
  dimmed?: boolean;
  [key: string]: unknown;
}

const typeIcons: Record<string, string> = {
  function: 'ƒ', arrow: '→', method: '◆', variable: '▣', class: '◈',
};

function getFragilityColor(f: number): string {
  if (f >= 0.6) return '#ff4757';
  if (f >= 0.3) return '#ffa502';
  return '#2ed573';
}

// Node size functions removed in favor of compact grid.

function AtomNodeComponent({ data, selected, targetPosition = Position.Left, sourcePosition = Position.Right }: NodeProps) {
  const d = data as AtomNodeData;
  const isOrphan = (d.inDegree || 0) === 0 && (d.outDegree || 0) === 0;
  const isGateway = (d.internalInDegree || 0) === 0 && (d.inDegree || 0) > 0;
  
  // Technical Alias for anonymous functions to maintain Blueprint aesthetic
  const displayLabel = (d.label.startsWith('anonymous') || d.label.startsWith('function')) 
    ? `ƒ_L${d.lineStart}` 
    : d.label;

  // Neon Diagnostic Colors
  let statusColor = getFragilityColor(d.fragility);
  let statusLabel = '';
  
  if (d.isOrchestrator) {
    statusColor = '#f9e2af'; // Catppuccin Yellow
    statusLabel = 'CORE';
  } else if (isOrphan) {
    statusColor = '#f38ba8'; // Catppuccin Red
    statusLabel = 'ORPHAN';
  } else if (isGateway) {
    statusColor = '#a6e3a1'; // Catppuccin Green
    statusLabel = 'GATEWAY';
  }

  const icon = typeIcons[d.atomType] || 'ƒ';
  const isData = d.atomType === 'variable' || d.atomType === 'property';
  const radius = isData ? '4px' : '20px';
  const externalCallers = Math.max(0, d.inDegree - (d.internalInDegree || 0));

  return (
    <div 
      onContextMenu={(e) => {
        e.preventDefault();
        // Concept for future Right-Click Lineage Menu
        console.log(`Right click on ${d.label} - Open lineage menu`);
      }}
      style={{
        background: isOrphan ? 'rgba(243, 139, 168, 0.05)' : 'rgba(30, 30, 46, 0.85)',
        border: `1px solid ${selected ? '#89b4fa' : (d.isOrchestrator ? '#f9e2afaa' : (isOrphan ? '#f38ba866' : (isGateway ? '#a6e3a166' : '#313244')))}`,
        borderLeft: `4px solid ${statusColor}`,
        borderRadius: radius,
        padding: '6px 12px',
        width: 170,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        color: isOrphan ? '#f38ba8' : 'var(--fg-text)',
        boxShadow: selected ? `0 0 10px ${statusColor}33` : '0 2px 4px rgba(0,0,0,0.2)',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
        opacity: d.dimmed && !selected ? 0.25 : 1,
        transform: selected ? 'scale(1.02)' : 'scale(1)',
        position: 'relative'
      }}
    >
      <Handle type="target" position={targetPosition} style={{ background: '#585b70', width: 6, height: 6, opacity: 0 }} />

      {/* Semantic Diagnostic Badge */}
      {statusLabel && (
        <div style={{
          position: 'absolute', top: '-14px', right: '4px',
          fontSize: '7.5px', color: statusColor, fontWeight: 'bold',
          textTransform: 'uppercase', letterSpacing: '0.4px',
          background: 'rgba(30, 30, 46, 0.9)', padding: '1px 4px', borderRadius: '3px',
          border: `1px solid ${statusColor}33`
        }}>
          {statusLabel === 'CORE' && <span style={{ marginRight: '4px' }}>🎯</span>}
          {statusLabel}
        </div>
      )}

      {/* Active Portal: External Callers (Teleport Trigger) */}
      {externalCallers > 0 && (
        <div 
          onClick={(e) => {
            e.stopPropagation();
            // This will trigger the sidebar portal list focus
            alert(`Teleport Protocol: Opening ${externalCallers} external call sites in sidebar...`);
          }}
          style={{
            position: 'absolute', left: '-12px', top: '50%', transform: 'translateY(-50%)',
            background: '#f38ba8', color: '#11111b', fontSize: '9px', fontWeight: 'bold',
            padding: '2px 4px', borderRadius: '4px', border: '1px solid #11111b',
            zIndex: 10, boxShadow: '0 0 6px rgba(243,139,168,0.4)', cursor: 'pointer'
          }} title="CLICK TO TELEPORT: View external callers in sidebar">
          → {externalCallers}
        </div>
      )}

      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 22, height: 22, background: `${statusColor}15`, borderRadius: isData ? '3px' : '50%',
        fontSize: '12px', fontWeight: 700, color: statusColor, flexShrink: 0
      }}>{icon}</span>
      
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <strong style={{ 
          fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          color: selected ? '#89b4fa' : (isOrphan ? '#f38ba8' : '#cdd6f4')
        }}>
          {displayLabel}
        </strong>
      </div>

      {d.isExported && (
        <span style={{ 
          width: 6, height: 6, borderRadius: '50%', background: '#a6e3a1',
          boxShadow: '0 0 6px #a6e3a1', flexShrink: 0
        }} title="Exported" />
      )}

      {(d.eventEmitters as any[])?.length > 0 && (
        <span style={{ fontSize: '10px', filter: 'drop-shadow(0 0 2px #f9e2af)', flexShrink: 0 }} title="Event Emitter">⚡</span>
      )}

      {(d.eventListeners as any[])?.length > 0 && (
        <span style={{ fontSize: '11px', filter: 'drop-shadow(0 0 2px #a6e3a1)', flexShrink: 0 }} title="Event Listener">👂</span>
      )}

      {(d.riskLevel === 'high' || d.riskLevel === 'critical' || d.complexity > 10) && (
        <span style={{ 
          width: 6, height: 6, borderRadius: '50%', background: '#ff4757',
          boxShadow: '0 0 6px #ff4757', flexShrink: 0
        }} title="High Risk" />
      )}

      <Handle type="source" position={sourcePosition} style={{ background: '#585b70', width: 6, height: 6, opacity: 0 }} />
    </div>
  );
}

export const AtomNode = memo(AtomNodeComponent);
