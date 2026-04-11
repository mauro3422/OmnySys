import { useMemo, useEffect, useCallback } from 'react';
import {
  ReactFlow, Controls, Background, BackgroundVariant,
  useNodesState, useEdgesState, ConnectionLineType, MarkerType,
  type Node, type Edge, Position, useReactFlow, ReactFlowProvider,
  MiniMap
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import * as dagre from 'dagre';
import type { FileInfo, FileDependency } from '../types';
import { FileNode } from '../components/FileNode';

interface Props {
  files: FileInfo[];
  dependencies: FileDependency[];
  selectedFile: string | null;
  onFileSelect?: (filePath: string) => void;
}

const riskColors: Record<string, string> = {
  critical: '#ff4757', high: '#ff6b6b', medium: '#ffa502', low: '#2ed573',
};

const nodeTypes = { fileNode: FileNode };
const nodeWidth = 180;
const nodeHeight = 50;

const getLayoutedElements = (initialNodes: Node[], initialEdges: Edge[], direction = 'LR') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, nodesep: 60, ranksep: 120 });
  initialNodes.forEach(n => dagreGraph.setNode(n.id, { width: nodeWidth, height: nodeHeight }));
  initialEdges.forEach(e => dagreGraph.setEdge(e.source, e.target));
  dagre.layout(dagreGraph);

  const nodes = initialNodes.map(node => {
    const pos = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: direction === 'LR' ? Position.Left : Position.Top,
      sourcePosition: direction === 'LR' ? Position.Right : Position.Bottom,
      position: { x: pos.x - nodeWidth / 2, y: pos.y - nodeHeight / 2 },
    };
  });
  return { nodes, edges: initialEdges };
};

function DependencyGraphInner({ files, dependencies, selectedFile, onFileSelect }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (!selectedFile) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const relevantEdgesList = dependencies.filter(d => d.source === selectedFile || d.target === selectedFile);
    const relatedPaths = new Set<string>([selectedFile]);
    relevantEdgesList.forEach(e => {
      relatedPaths.add(e.source);
      relatedPaths.add(e.target);
    });

    const relevantFiles = files.filter(f => relatedPaths.has(f.path));

    const initialNodes: Node[] = relevantFiles.map(f => {
      const isCenter = f.path === selectedFile;
      const isNeighbor = !isCenter && relevantEdgesList.some(e => e.source === f.path || e.target === f.path);
      return {
        id: f.path,
        type: 'fileNode',
        position: { x: 0, y: 0 },
        data: {
          label: f.path.split('/').pop() || f.path,
          color: isCenter ? '#89b4fa' : (isNeighbor ? '#fab387' : (riskColors[f.riskLevel] || '#585b70')),
          totalComplexity: f.totalComplexity || 0,
          avgFragility: f.avgFragility || 0,
          isCenter,
          isNeighbor
        }
      };
    });

    const fileEdges: Edge[] = dependencies.map((d, i) => {
      const isOutgoing = d.source === selectedFile;
      const isIncoming = d.target === selectedFile;
      const isCore = isOutgoing || isIncoming;
      
      const edgeColor = isOutgoing ? '#89b4fa' : (isIncoming ? '#b4befe' : '#585b70');
      
      return {
        id: `e-${i}`,
        source: d.source,
        target: d.target,
        animated: d.isDynamic || isOutgoing,
        style: { 
          stroke: edgeColor,
          strokeWidth: isCore ? 2 : 1,
          opacity: isCore ? 1 : 0.2
        },
        markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor }
      };
    });

    // 2. Global Phantom Edges: Event Flow discovery
    files.forEach(sourceFile => {
      const emitters = (sourceFile as any).eventEmitters || [];
      files.forEach(targetFile => {
        if (sourceFile.path === targetFile.path) return;
        const listeners = (targetFile as any).eventListeners || [];
        
        emitters.forEach((e: any) => {
          if (listeners.some((l: any) => l.eventName === e.eventName)) {
            const isRelevant = sourceFile.path === selectedFile || targetFile.path === selectedFile;
            fileEdges.push({
              id: `event-${sourceFile.path}-${targetFile.path}-${e.eventName}`,
              source: sourceFile.path,
              target: targetFile.path,
              label: `⚡ ${e.eventName}`,
              animated: true,
              style: { 
                stroke: '#f9e2af', 
                strokeWidth: isRelevant ? 2 : 1, 
                strokeDasharray: '5,5', 
                opacity: isRelevant ? 0.8 : 0.1 
              },
              labelStyle: { fill: '#f9e2af', fontSize: 9, fontWeight: 'bold' },
              type: 'bezier'
            });
          }
        });
      });
    });

    if (initialNodes.length > 0) {
      const { nodes: ln, edges: le } = getLayoutedElements(initialNodes, fileEdges, 'LR');
      setNodes(ln);
      setEdges(le);
      
      const timer = setTimeout(() => {
        fitView({ padding: 0.3, duration: 600 });
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setNodes([]);
      setEdges([]);
    }
  }, [files, dependencies, selectedFile, setNodes, setEdges, fitView]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    if (onFileSelect) onFileSelect(node.id);
  }, [onFileSelect]);

  if (files.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🪐</div>
        <h3>No System Data</h3>
        <p>Load a database to visualize dependencies...</p>
      </div>
    );
  }

  if (!selectedFile) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🎯</div>
        <h3>Ego-Graph Focus</h3>
        <p>Select a file from Structure to view its local dependencies.</p>
        <p style={{ opacity: 0.5, fontSize: '0.9em', marginTop: '1rem' }}>Global graphs are disabled to preserve performance.</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView fitViewOptions={{ padding: 0.3, duration: 600 }}
        minZoom={0.05} maxZoom={1.5}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#45475a" />
        <Controls />
        <MiniMap 
          style={{ background: '#1e1e2e', border: '1px solid #313244', borderRadius: '8px' }}
          maskColor="rgba(0, 0, 0, 0.2)"
          nodeColor={(n) => (n.data as any).color || '#585b70'}
        />
      </ReactFlow>
    </div>
  );
}

export function DependencyGraph(props: Props) {
  return (
    <ReactFlowProvider>
      <DependencyGraphInner {...props} />
    </ReactFlowProvider>
  );
}
