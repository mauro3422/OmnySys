import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

interface FileNodeData {
  label: string;
  fullPath: string;
  riskScore: number;
  riskLevel: string;
  atomCount: number;
  complexity: number;
  culture: string;
  [key: string]: unknown;
}

const riskColors: Record<string, string> = {
  critical: '#ff4757',
  high: '#ff6b6b',
  medium: '#ffa502',
  low: '#2ed573',
};

const cultureIcons: Record<string, string> = {
  citizen: '📄',
  auditor: '🔍',
  gatekeeper: '🛡️',
  law: '⚖️',
  entrypoint: '🚀',
  script: '⚙️',
};

function FileNodeComponent({ data }: NodeProps) {
  const d = data as FileNodeData;
  const borderColor = riskColors[d.riskLevel] || '#555';
  const icon = cultureIcons[d.culture] || '📄';
  const riskPct = Math.round((d.riskScore || 0) * 100);

  return (
    <div
      style={{
        background: 'var(--node-bg, #1e1e2e)',
        border: `2px solid ${borderColor}`,
        borderRadius: 10,
        padding: '10px 14px',
        minWidth: 160,
        fontFamily: 'var(--vscode-font-family, Inter, system-ui)',
        fontSize: 12,
        color: 'var(--node-fg, #cdd6f4)',
        boxShadow: `0 0 12px ${borderColor}33`,
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: borderColor, width: 8, height: 8 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
          {d.label}
        </strong>
      </div>

      <div style={{ display: 'flex', gap: 8, fontSize: 10, opacity: 0.8 }}>
        <span title="Atoms">⚛ {d.atomCount}</span>
        <span title="Complexity">🧠 {d.complexity}</span>
        <span
          title={`Risk: ${d.riskLevel}`}
          style={{ color: borderColor, fontWeight: 600 }}
        >
          ⚠ {riskPct}%
        </span>
      </div>

      <Handle type="source" position={Position.Bottom} style={{ background: borderColor, width: 8, height: 8 }} />
    </div>
  );
}

export const FileNode = memo(FileNodeComponent);
