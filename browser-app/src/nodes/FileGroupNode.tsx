import { memo } from 'react';

interface Props {
  data: {
    label: string;
  };
  selected?: boolean;
}

export const FileGroupNode = memo(({ data, selected }: Props) => {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(30, 30, 46, 0.3)',
      border: `2px ${selected ? 'solid #89b4fa' : 'dashed #585b70'}`,
      borderRadius: '16px',
      position: 'relative',
      zIndex: -1, // Push completely back
      pointerEvents: 'none' // Prevent swallowing child clicks, ReactFlow dragging works on the node element wrapper
    }}>
      {/* Interactive header for dragging when clicking inside the bounding box */}
      <div 
        className="custom-drag-handle"
        style={{
        position: 'absolute',
        top: -30,
        left: 0,
        pointerEvents: 'all', // Override parent's none so we can drag
        fontSize: '14px',
        fontWeight: 'bold',
        color: 'var(--fg-text)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <span style={{ fontSize: '16px' }}>📄</span>
        {data.label}
      </div>
    </div>
  );
});
