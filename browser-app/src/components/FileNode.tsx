import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

interface FileNodeData {
  label: string;
  color: string;
  totalComplexity: number;
  avgFragility: number;
  isCenter?: boolean;
}

export const FileNode = memo(({ data, isConnectable }: { data: FileNodeData; isConnectable: boolean }) => {
  const fragility = data.avgFragility || 0;
  const borderWidth = 1.5 + (fragility * 1.5);

  return (
    <div
      style={{
        background: data.isCenter ? 'rgba(137, 180, 250, 0.1)' : '#1e1e2e',
        border: `${borderWidth}px solid ${data.color}`,
        borderRadius: '24px',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        minWidth: '150px',
        maxWidth: '220px',
        position: 'relative',
        boxShadow: data.isCenter ? `0 0 15px ${data.color}80` : '0 4px 10px rgba(0, 0, 0, 0.4)'
      }}
    >
      <Handle type="target" position={Position.Left} isConnectable={isConnectable}
        style={{ background: '#555', border: 'none', width: '6px', height: '6px', left: '-3px' }} />

      <div style={{ fontSize: data.isCenter ? '16px' : '12px', flexShrink: 0 }}>{data.isCenter ? '🎯' : '🪐'}</div>
      <div
        style={{
          fontSize: '11px', color: '#cdd6f4', fontFamily: 'sans-serif',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
        }}
        title={data.label}
      >
        {data.label}
      </div>

      {data.totalComplexity > 50 && (
        <div style={{
          position: 'absolute', top: '-8px', right: '-8px',
          background: '#fab387', color: '#11111b', fontSize: '9px',
          fontWeight: 'bold', padding: '2px 6px', borderRadius: '10px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
        }}>
          C:{data.totalComplexity}
        </div>
      )}

      <Handle type="source" position={Position.Right} isConnectable={isConnectable}
        style={{ background: '#555', border: 'none', width: '6px', height: '6px', right: '-3px' }} />
    </div>
  );
});

FileNode.displayName = 'FileNode';
