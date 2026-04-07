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
  [key: string]: unknown;
}

const typeIcons: Record<string, string> = {
  function: 'ƒ',
  arrow: '→',
  method: '◆',
  variable: '▣',
  class: '◈',
};

function getFragilityColor(f: number): string {
  if (f >= 0.6) return '#ff4757';
  if (f >= 0.3) return '#ffa502';
  return '#2ed573';
}

function getNodeSize(complexity: number): number {
  return Math.max(140, Math.min(220, 140 + complexity * 4));
}

function AtomNodeComponent({ data }: NodeProps) {
  const d = data as AtomNodeData;
  const color = getFragilityColor(d.fragility);
  const width = getNodeSize(d.complexity);
  const icon = typeIcons[d.atomType] || 'ƒ';

  return (
    <div
      style={{
        background: 'var(--node-bg, #1e1e2e)',
        border: `2px solid ${color}`,
        borderRadius: 8,
        padding: '8px 12px',
        width,
        fontFamily: 'var(--vscode-font-family, Inter, system-ui)',
        fontSize: 11,
        color: 'var(--node-fg, #cdd6f4)',
        boxShadow: `0 0 10px ${color}22`,
        transition: 'all 0.2s ease',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: color, width: 6, height: 6 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 22,
            height: 22,
            background: `${color}22`,
            borderRadius: 4,
            fontSize: 13,
            fontWeight: 700,
            color,
          }}
        >
          {icon}
        </span>
        <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {d.label}
        </strong>
        {d.isExported && (
          <span style={{ fontSize: 9, background: '#89b4fa33', color: '#89b4fa', padding: '1px 4px', borderRadius: 3 }}>
            EXP
          </span>
        )}
        {d.isAsync && (
          <span style={{ fontSize: 9, background: '#a6e3a133', color: '#a6e3a1', padding: '1px 4px', borderRadius: 3 }}>
            ASY
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6, fontSize: 10, opacity: 0.75, flexWrap: 'wrap' }}>
        <span title="Cyclomatic Complexity">CC:{d.complexity}</span>
        <span title="Lines of Code">LOC:{d.linesOfCode}</span>
        <span title={`Fragility: ${Math.round(d.fragility * 100)}%`} style={{ color }}>
          F:{Math.round(d.fragility * 100)}%
        </span>
        {d.inDegree > 0 && <span title="Callers (in-degree)">↓{d.inDegree}</span>}
        {d.outDegree > 0 && <span title="Callees (out-degree)">↑{d.outDegree}</span>}
      </div>

      {d.archetype && d.archetype !== 'standard' && (
        <div style={{ fontSize: 9, marginTop: 3, opacity: 0.5, fontStyle: 'italic' }}>
          {d.archetype}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} style={{ background: color, width: 6, height: 6 }} />
    </div>
  );
}

export const AtomNode = memo(AtomNodeComponent);
