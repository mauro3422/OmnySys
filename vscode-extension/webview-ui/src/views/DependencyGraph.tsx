import { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { FileInfo, FileDependency } from '../types';
import { useVsCode } from '../hooks/useVsCode';

interface Props {
  files: FileInfo[];
  dependencies: FileDependency[];
  onFileSelect?: (filePath: string) => void;
}

const riskColors: Record<string, string> = {
  critical: '#ff4757',
  high: '#ff6b6b',
  medium: '#ffa502',
  low: '#2ed573',
};

export function DependencyGraph({ files, dependencies, onFileSelect }: Props) {
  const { openFile } = useVsCode();
  const fgRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Resize observer to keep the canvas filling the screen
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const graphData = useMemo(() => {
    const nodes = files.map(f => ({
      id: f.path,
      name: f.path.split('/').pop() || f.path,
      val: Math.max(1, Math.min(20, (f.totalComplexity || 1) / 5)),
      color: riskColors[f.riskLevel] || '#585b70',
      ...f
    }));

    const filePaths = new Set(nodes.map(n => n.id));

    const links = dependencies
      .filter(d => filePaths.has(d.source) && filePaths.has(d.target))
      .map(d => ({
        source: d.source,
        target: d.target,
        color: d.isDynamic ? '#f1c40f' : '#585b7066'
      }));

    return { nodes, links };
  }, [files, dependencies]);

  const handleNodeClick = useCallback((node: any) => {
    if (onFileSelect) onFileSelect(node.id);
  }, [onFileSelect]);

  const handleNodeRightClick = useCallback((node: any) => {
    openFile(node.id);
  }, [openFile]);

  // Configure physics to help DAG layout
  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force('collide', null); // Removed collision to let DAG handle separation
      fgRef.current.d3Force('charge').strength(-200);
      fgRef.current.d3Force('link').distance(40);
      
      setTimeout(() => {
        fgRef.current?.zoomToFit(400, 50);
      }, 500);
    }
  }, [graphData]);

  if (files.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🪐</div>
        <h3>No System Data</h3>
        <p>Waiting for data from OmnySystem...</p>
      </div>
    );
  }

  // Draw a card for the node
  const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number, isHitTest = false) => {
    const label = node.name;
    const fontSize = 10;
    ctx.font = `${fontSize}px Sans-Serif`;
    const textWidth = ctx.measureText(label).width;
    const width = Math.max(100, textWidth + 30);
    const height = 28;
    const radius = 4;

    const x = node.x - width / 2;
    const y = node.y - height / 2;

    if (isHitTest) {
      // For hit testing, draw a simple rectangle using the provided color
      ctx.fillRect(x, y, width, height);
      return;
    }

    // Draw Card Background
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();

    ctx.fillStyle = '#1e1e2e'; // Dark background similar to Atoms
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = node.color; // Risk border
    ctx.stroke();

    // Draw Icon (📄)
    ctx.fillStyle = '#cdd6f4';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('📄', x + 5, node.y);

    // Draw Label text
    ctx.fillStyle = '#cdd6f4';
    ctx.fillText(label, x + 22, node.y);
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#11111b' }}>
      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        dagMode="td"
        dagLevelDistance={80}
        nodeLabel="id" // Tooltip path
        linkColor="color"
        linkWidth={1.5}
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        onNodeClick={handleNodeClick}
        onNodeRightClick={handleNodeRightClick}
        nodeCanvasObject={(node: any, ctx, globalScale) => paintNode(node, ctx, globalScale, false)}
        nodePointerAreaPaint={(node: any, color, ctx) => {
          ctx.fillStyle = color;
          paintNode(node, ctx, 1, true);
        }}
      />
    </div>
  );
}
