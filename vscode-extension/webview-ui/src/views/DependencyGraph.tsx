import { useMemo, useCallback, useEffect, useState } from 'react';
import { 
  ReactFlow, 
  Controls, 
  Background, 
  BackgroundVariant, 
  useNodesState, 
  useEdgesState, 
  ConnectionLineType,
  MarkerType,
  Node,
  Edge,
  Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import * as dagre from 'dagre';
import type { FileInfo, FileDependency } from '../types';
import { useVsCode } from '../hooks/useVsCode';
import { FileNode } from '../components/FileNode';

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

const nodeTypes = {
  fileNode: FileNode,
};

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));
const nodeWidth = 150;
const nodeHeight = 40;

const getLayoutedElements = (initialNodes: Node[], initialEdges: Edge[], direction = 'TB') => {
  dagreGraph.setGraph({ rankdir: direction, nodesep: 40, ranksep: 70 });

  initialNodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  initialEdges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const nodes = initialNodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes, edges: initialEdges };
};

export function DependencyGraph({ files, dependencies, onFileSelect }: Props) {
  const { openFile } = useVsCode();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    const filePaths = new Set(files.map(f => f.path));

    const initialNodes: Node[] = files.map(f => ({
      id: f.path,
      type: 'fileNode',
      position: { x: 0, y: 0 },
      data: {
        label: f.path.split('/').pop() || f.path,
        color: riskColors[f.riskLevel] || '#585b70',
        totalComplexity: f.totalComplexity || 0,
        avgFragility: (f as any).avgFragility || 0
      }
    }));

    const initialEdges: Edge[] = dependencies
      .filter(d => filePaths.has(d.source) && filePaths.has(d.target))
      .map(d => {
        const sourceFile = files.find(f => f.path === d.source);
        const sourceColor = sourceFile ? (riskColors[sourceFile.riskLevel] || '#585b70') : '#7f849c';
        const edgeColor = d.isDynamic ? '#f1c40f' : sourceColor;
        
        return {
          id: `${d.source}-${d.target}`,
          source: d.source,
          target: d.target,
          type: 'smoothstep',
          animated: d.isDynamic,
          style: { stroke: edgeColor, strokeWidth: d.isDynamic ? 2 : 1.2, opacity: 0.8 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: edgeColor,
          },
        };
      });

    if (initialNodes.length > 0) {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        initialNodes,
        initialEdges
      );
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    } else {
      setNodes([]);
      setEdges([]);
    }
  }, [files, dependencies, setNodes, setEdges]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    if (onFileSelect) onFileSelect(node.id);
  }, [onFileSelect]);

  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: Node) => {
    e.preventDefault();
    openFile(node.id);
  }, [openFile]);

  if (files.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🪐</div>
        <h3>No System Data</h3>
        <p>Waiting for data from OmnySystem...</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#45475a" />
        <Controls />
      </ReactFlow>
    </div>
  );
}
