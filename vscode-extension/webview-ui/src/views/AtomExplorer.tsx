import { useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AtomNode } from '../nodes/AtomNode';
import type { AtomInfo, AtomRelation } from '../types';
import { useVsCode } from '../hooks/useVsCode';
import dagre from 'dagre';

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction: 'TB' | 'LR' = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({ rankdir: direction, nodesep: 40, ranksep: 100, align: 'UL' });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 220, height: 80 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = direction === 'LR' ? Position.Left : Position.Top;
    node.sourcePosition = direction === 'LR' ? Position.Right : Position.Bottom;

    node.position = {
      x: nodeWithPosition.x - 220 / 2,
      y: nodeWithPosition.y - 80 / 2,
    };
  });

  return { nodes, edges };
};

interface Props {
  atoms: AtomInfo[];
  relations: AtomRelation[];
  filePath: string | null;
}

const nodeTypes = { atomNode: AtomNode };

export function AtomExplorer({ atoms, relations, filePath }: Props) {
  const { requestFileAtoms, openFile } = useVsCode();

  // Request atoms when file changes
  useEffect(() => {
    if (filePath) {
      requestFileAtoms(filePath);
    }
  }, [filePath, requestFileAtoms]);

  const initialNodes: Node[] = useMemo(() => {
    // Layout atoms in rows by type
    const byType: Record<string, AtomInfo[]> = {};
    atoms.forEach(a => {
      const t = a.type || 'unknown';
      if (!byType[t]) byType[t] = [];
      byType[t].push(a);
    });

    const allNodes: Node[] = [];
    let yOffset = 0;
    const typeOrder = ['class', 'function', 'method', 'arrow', 'variable'];

    for (const type of typeOrder) {
      const group = byType[type];
      if (!group || !group.length) continue;

      group.forEach((atom, i) => {
        allNodes.push({
          id: atom.id,
          type: 'atomNode',
          position: { x: 0, y: 0 }, // Handled by dagre
          data: {
            label: atom.name,
            atomType: atom.type,
            complexity: atom.complexity,
            fragility: atom.fragilityScore,
            isExported: atom.isExported,
            isAsync: atom.isAsync,
            archetype: atom.archetype || '',
            centralityClass: atom.centralityClass || '',
            linesOfCode: atom.linesOfCode,
            inDegree: atom.inDegree,
            outDegree: atom.outDegree,
          },
        });
      });
    }

    return allNodes;
  }, [atoms]);

  const initialEdges: Edge[] = useMemo(() => {
    const atomIds = new Set(atoms.map(a => a.id));
    return relations
      .filter(r => atomIds.has(r.sourceId) && atomIds.has(r.targetId))
      .map((r, i) => ({
        id: `rel-${i}`,
        source: r.sourceId,
        target: r.targetId,
        label: r.relationType === 'calls' ? '' : r.relationType,
        animated: r.relationType === 'calls',
        style: {
          stroke: r.relationType === 'calls' ? '#89b4fa' : '#f5c2e7',
          strokeWidth: Math.max(1, Math.min(3, r.weight * 2)),
        },
        type: 'smoothstep',
      }));
  }, [atoms, relations]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    if (initialNodes.length > 0) {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        initialNodes,
        initialEdges,
        'TB' // top to bottom for atoms looks like a good AST/dependency tree
      );
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    } else {
      setNodes([]);
      setEdges([]);
    }
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  if (!filePath) {
    return (
      <div className="empty-state">
        <div className="empty-icon">⚛️</div>
        <h3>No File Selected</h3>
        <p>Open a file in VS Code or click a node in the dependency graph</p>
      </div>
    );
  }

  if (atoms.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🔍</div>
        <h3>{filePath.split('/').pop()}</h3>
        <p>Loading atoms...</p>
      </div>
    );
  }

  const basename = filePath.split('/').pop() || filePath;
  const totalCC = atoms.reduce((s, a) => s + a.complexity, 0);
  const exported = atoms.filter(a => a.isExported).length;
  const asyncCount = atoms.filter(a => a.isAsync).length;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* File Header */}
      <div className="atom-header">
        <div className="atom-header-title">
          <span className="atom-header-icon">📄</span>
          <strong>{basename}</strong>
          <span className="atom-header-path">{filePath}</span>
        </div>
        <div className="atom-header-stats">
          <span className="stat-chip">⚛ {atoms.length} atoms</span>
          <span className="stat-chip">🧠 CC:{totalCC}</span>
          <span className="stat-chip">📤 {exported} exported</span>
          {asyncCount > 0 && <span className="stat-chip">⚡ {asyncCount} async</span>}
        </div>
      </div>

      {/* Graph */}
      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.3}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#313244" gap={16} size={1} />
          <Controls
            position="bottom-right"
            style={{ background: '#1e1e2e', border: '1px solid #45475a', borderRadius: 8 }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}
