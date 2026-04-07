import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

interface FileNodeData {
  label: string;
  color: string;
  totalComplexity: number;
  avgFragility: number;
}

export const FileNode = memo(({ data, isConnectable }: { data: FileNodeData; isConnectable: boolean }) => {
  const fragility = data.avgFragility || 0;
  const borderWidth = 1.5 + (fragility * 1.5);

  return (
    <div 
      style={{
        background: '#1e1e2e',
        border: `${borderWidth}px solid ${data.color}`,
        borderRadius: '6px',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        minWidth: '130px',
        maxWidth: '220px',
        position: 'relative',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
      }}
    >
      {/* Target handle (top) */}
      <Handle 
        type="target" 
        position={Position.Top} 
        isConnectable={isConnectable} 
        style={{ background: '#555', border: 'none', width: '6px', height: '6px' }}
      />
      
      <div style={{ fontSize: '14px', flexShrink: 0 }}>📄</div>
      <div 
        style={{ 
          fontSize: '11px', 
          color: '#cdd6f4',
          fontFamily: 'sans-serif',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
        title={data.label}
      >
        {data.label}
      </div>

      {data.totalComplexity > 50 && (
        <div style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          background: '#fab387',
          color: '#11111b',
          fontSize: '9px',
          fontWeight: 'bold',
          padding: '2px 6px',
          borderRadius: '10px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
        }}>
          C:{data.totalComplexity}
        </div>
      )}

      {/* Source handle (bottom) */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        isConnectable={isConnectable} 
        style={{ background: '#555', border: 'none', width: '6px', height: '6px' }}
      />
    </div>
  );
});

FileNode.displayName = 'FileNode';
