import { useMemo, useEffect, useCallback, useRef, useState } from 'react';
import {
  ReactFlow, ReactFlowProvider, Background, Controls,
  useNodesState, useEdgesState, useReactFlow,
  type Node, type Edge, Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AtomNode } from '../nodes/AtomNode';
import { FileGroupNode } from '../nodes/FileGroupNode';
import type { AtomInfo, AtomRelation } from '../types';
import dagre from 'dagre';

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction: 'TB' | 'LR' = 'LR', filePath: string) => {
  const connectedNodeIds = new Set<string>();
  edges.forEach(e => {
    connectedNodeIds.add(e.source);
    connectedNodeIds.add(e.target);
  });

  const connectedNodes = nodes.filter(n => connectedNodeIds.has(n.id));
  const standaloneNodes = nodes.filter(n => !connectedNodeIds.has(n.id));

  let cMaxX = 0, cMaxY = 0;

  // 1. Layout connected graph
  if (connectedNodes.length > 0) {
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    // LR direction is best for data-flow blueprints. Adding spacing to prevent edge overlap
    g.setGraph({ rankdir: direction, nodesep: 40, ranksep: 180, align: 'UL' });
    connectedNodes.forEach(n => g.setNode(n.id, { width: 170, height: 40 }));
    edges.forEach(e => g.setEdge(e.source, e.target));
    dagre.layout(g);

    let tMinX = Infinity, tMinY = Infinity, tMaxX = -Infinity, tMaxY = -Infinity;
    connectedNodes.forEach(node => {
      const p = g.node(node.id);
      node.position = { x: p.x - 85, y: p.y - 20 };
      if (node.position.x < tMinX) tMinX = node.position.x;
      if (node.position.y < tMinY) tMinY = node.position.y;
      if (node.position.x + 170 > tMaxX) tMaxX = node.position.x + 170;
      if (node.position.y + 40 > tMaxY) tMaxY = node.position.y + 40;
    });

    // Normalize so Top-Left is 0,0
    connectedNodes.forEach(node => {
      node.position.x -= tMinX;
      node.position.y -= tMinY;
    });

    cMaxX = tMaxX - tMinX;
    cMaxY = tMaxY - tMinY;
  }

  // 2. Layout standalone nodes in a Grid
  const cols = 4; // Max 4 nodes wide for pill density
  const nodeW = 170, nodeH = 40;
  const gapX = 20, gapY = 16;

  const startY = connectedNodes.length > 0 ? cMaxY + 80 : 0;
  let sMaxX = 0, sMaxY = startY;

  standaloneNodes.forEach((node, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const nx = col * (nodeW + gapX);
    const ny = startY + row * (nodeH + gapY);
    node.position = { x: nx, y: ny };
    
    if (nx + nodeW > sMaxX) sMaxX = nx + nodeW;
    if (ny + nodeH > sMaxY) sMaxY = ny + nodeH;
  });

  const finalNodes = [...connectedNodes, ...standaloneNodes];
  const wrapMaxX = Math.max(cMaxX, sMaxX) || nodeW;
  const wrapMaxY = Math.max(cMaxY, (standaloneNodes.length ? sMaxY : 0)) || nodeH;

  const paddingX = 40, paddingY = 60;
  const groupNodeId = `group-${filePath}`;
  
  const groupNode: Node = {
    id: groupNodeId,
    type: 'fileGroupNode',
    position: { x: 0, y: 0 }, 
    style: {
      width: wrapMaxX + (paddingX * 2),
      height: wrapMaxY + (paddingY * 2),
    },
    data: { label: filePath.split('/').pop() },
    draggable: true,
    selectable: false, // CRITICAL: Prevent ReactFlow from bringing box to z-index 1000 on click
    focusable: false,
    dragHandle: '.custom-drag-handle', // Intercept drag only on the header so internal clicks are never intercepted
    zIndex: -1, // Keep behind child nodes
  };

  finalNodes.forEach(node => {
    node.targetPosition = direction === 'LR' ? Position.Left : Position.Top;
    node.sourcePosition = direction === 'LR' ? Position.Right : Position.Bottom;
    node.parentNode = groupNodeId;
    node.extent = 'parent';
    // Shift child positions strictly inside group box bounds
    node.position = { x: node.position.x + paddingX, y: node.position.y + paddingY };
  });

  return { nodes: [groupNode, ...finalNodes], edges };
};

interface Props {
  atoms: AtomInfo[];
  relations: AtomRelation[];
  filePath: string | null;
  onFileSelect?: (path: string, symbolName?: string) => void;
  activeSymbolName?: string | null;
}

const nodeTypes = { atomNode: AtomNode, fileGroupNode: FileGroupNode };

/** Inner component that has access to useReactFlow */
function AtomExplorerInner({ atoms, relations, filePath, onFileSelect, activeSymbolName }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView } = useReactFlow();
  const prevFileRef = useRef<string | null>(null);
  const [selectedAtomId, setSelectedAtomId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const [atomHistory, setAtomHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [hoveredCode, setHoveredCode] = useState<{ id: string, code: string } | null>(null);

  // Ghost Preview Toggle
  const onNodeMouseEnter = useCallback((_: any, node: Node) => {
    if (node.type === 'atomNode') {
      const atom = node.data as any;
      fetch(`http://localhost:3377/api/code/snippet?path=${encodeURIComponent(filePath!)}&start=${atom.lineStart}&end=${atom.lineEnd}`)
        .then(res => res.json())
        .then(data => {
          if (data.snippet) setHoveredCode({ id: node.id, code: data.snippet });
        });
    }
  }, [filePath]);

  const onNodeMouseLeave = useCallback(() => {
    setHoveredCode(null);
  }, []);

  const selectedAtom = useMemo(() => atoms.find(a => String(a.id) === String(selectedAtomId)), [atoms, selectedAtomId]);

  // Fetch history when tab changes or atom changes
  useEffect(() => {
    if (activeTab === 'history' && selectedAtom && filePath) {
      setIsHistoryLoading(true);
      fetch(`http://localhost:3377/api/atom-history/${encodeURIComponent(selectedAtom.name)}?file=${encodeURIComponent(filePath)}`)
        .then(res => res.json())
        .then(data => {
          setAtomHistory(data.history || []);
          setIsHistoryLoading(false);
        })
        .catch(err => {
          console.error('Failed to fetch atom history:', err);
          setIsHistoryLoading(false);
        });
    }
  }, [activeTab, selectedAtom, filePath]);

  // Handle "Landing Focus" when a symbol name is provided from global state
  useEffect(() => {
    if (activeSymbolName && atoms.length > 0) {
      const atom = atoms.find(a => a.name === activeSymbolName);
      if (atom) {
        setSelectedAtomId(String(atom.id));
        setActiveTab('details');
        // Small delay to ensure layout is done
        setTimeout(() => {
          fitView({ nodes: [{ id: String(atom.id) }], duration: 800, padding: 2 });
        }, 500);
      }
    }
  }, [activeSymbolName, atoms, fitView]);

  const initialNodes: Node[] = useMemo(() => {
    // Find the 'Core' of the file (Orchestrator)
    const maxOutDegree = Math.max(...atoms.map(a => relations.filter(r => String(r.sourceId) === String(a.id)).length), 0);
    
    return atoms.map(a => {
      const internalCallersCount = relations.filter(r => String(r.targetId) === String(a.id)).length;
      const internalCalleesCount = relations.filter(r => String(r.sourceId) === String(a.id)).length;
      
      // Heuristic: Is it the main function? (Most internal calls or first in file if ties)
      const isOrchestrator = internalCalleesCount === maxOutDegree && maxOutDegree > 0;

      return {
        id: String(a.id),
        type: 'atomNode',
        position: { x: 0, y: 0 },
        data: {
          ...a,
          label: a.name,
          internalInDegree: internalCallersCount,
          internalOutDegree: internalCalleesCount,
          isOrchestrator
        },
      };
    });
  }, [atoms, relations]);

  const initialEdges: Edge[] = useMemo(() => {
    const ids = new Set(atoms.map(a => String(a.id)));
    const edges: Edge[] = [];
    
    // 1. Formal call/dependency relations
    relations
      .filter(r => ids.has(String(r.sourceId)) && ids.has(String(r.targetId)))
      .forEach((r, i) => {
        edges.push({
          id: `rel-${i}`, 
          source: String(r.sourceId), 
          target: String(r.targetId),
          label: r.relationType === 'calls' ? '' : r.relationType,
          animated: r.relationType === 'calls' || r.relationType === 'events',
          style: {
            stroke: r.relationType === 'calls' ? '#89b4fa' : '#f5c2e7',
            strokeWidth: 2,
            opacity: 0.8
          },
          markerEnd: { 
            type: MarkerType.ArrowClosed, 
            color: r.relationType === 'calls' ? '#89b4fa' : '#f5c2e7', 
            width: 20, height: 20 
          },
          type: 'smoothstep',
        });
      });

    // 2. Ghost Edges: Event Flow (System-wide or Local)
    const listeners = atoms.filter(a => (a as any).eventListeners?.length > 0);
    atoms.forEach(emitterAtom => {
      const emitters = (emitterAtom as any).eventEmitters || [];
      emitters.forEach((e: any) => {
        listeners.forEach(listenerAtom => {
          if (String(emitterAtom.id) === String(listenerAtom.id)) return;
          const matched = (listenerAtom as any).eventListeners.some((l: any) => l.eventName === e.eventName);
          if (matched) {
            edges.push({
              id: `ghost-${emitterAtom.id}-${listenerAtom.id}-${e.eventName}`,
              source: String(emitterAtom.id),
              target: String(listenerAtom.id),
              label: `⚡ ${e.eventName}`,
              animated: true,
              style: { stroke: '#f9e2af', strokeWidth: 2, strokeDasharray: '5,5', opacity: 0.8 },
              labelStyle: { fill: '#f9e2af', fontSize: 10, fontWeight: 'bold' },
              type: 'bezier'
            });
          }
        });
      });
    });

    // 3. Hierarchy Engine: Infer nesting from line ranges
    atoms.forEach(a => {
      let parent: AtomInfo | null = null;
      atoms.forEach(potentialParent => {
        if (potentialParent.id === a.id) return;
        // Check containment: a is inside potentialParent
        if (a.lineStart >= potentialParent.lineStart && a.lineEnd <= potentialParent.lineEnd) {
          if (!parent || (potentialParent.lineEnd - potentialParent.lineStart < parent.lineEnd - parent.lineStart)) {
            parent = potentialParent;
          }
        }
      });

      if (parent) {
        edges.push({
          id: `nested-${parent.id}-${a.id}`,
          source: String(parent.id),
          target: String(a.id),
          label: '', // Removiendo etiqueta técnica para limpieza visual
          animated: false,
          style: { stroke: '#cba6f7', strokeDasharray: '6,6', opacity: 0.35 },
          type: 'smoothstep'
        });
      }
    });

    return edges;
  }, [atoms, relations]);

  useEffect(() => {
    if (atoms.length > 0 && filePath) {
      // Create safe copies for layouting
      const safeNodes = [...initialNodes];
      const safeEdges = [...initialEdges];
      
      try {
        const { nodes: ln, edges: le } = getLayoutedElements(safeNodes, safeEdges, 'LR', filePath);
        setNodes(ln);
        setEdges(le);

        const timer = setTimeout(() => {
          if (!activeSymbolName) {
            fitView({ padding: 0.15, duration: 400 });
          }
        }, 150);
        return () => clearTimeout(timer);
      } catch (err) {
        console.error('Layout failed, falling back to basic grid:', err);
        setNodes(initialNodes);
        setEdges(initialEdges);
      }
    } else {
      setNodes([]);
      setEdges([]);
    }
  }, [initialNodes, initialEdges, atoms.length, setNodes, setEdges, fitView, filePath, activeSymbolName]);

  const { getEdges } = useReactFlow();

  // Tactile Focus: Dim unconnected nodes
  useEffect(() => {
    const currentEdges = getEdges();
    setNodes(nds => nds.map(n => {
      if (n.type !== 'atomNode') return n;
      if (!selectedAtom) return { ...n, data: { ...n.data, dimmed: false } };
      
      const connectedSet = new Set<string>([String(selectedAtom.id)]);
      currentEdges.forEach(e => {
        if (String(e.source) === String(selectedAtom.id)) connectedSet.add(e.target);
        if (String(e.target) === String(selectedAtom.id)) connectedSet.add(e.source);
      });
      return { ...n, data: { ...n.data, dimmed: !connectedSet.has(n.id) } };
    }));
  }, [selectedAtom, setNodes, getEdges]);

  if (!filePath) {
    return (
      <div className="empty-state">
        <div className="empty-icon">⚛️</div>
        <h3>No File Selected</h3>
        <p>Click a file in the tree or dependency graph</p>
      </div>
    );
  }

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedAtomId(node.id);
  }, []);

  const onNodeContextMenu = useCallback((event: any, node: Node) => {
    event.preventDefault(); // Prevent browser context menu
    setSelectedAtomId(node.id);
    setActiveTab('history');
  }, []);

  // Filter ONLY external relations for portals
  const externalCallers = useMemo(() => {
    return relations.filter(r => String(r.targetId) === String(selectedAtomId) && r.sourceFile !== filePath);
  }, [relations, selectedAtomId, filePath]);

  const internalCallers = useMemo(() => {
    if (!selectedAtom) return [];
    return relations
      .filter(r => String(r.targetId) === String(selectedAtom.id) && r.sourceFile === filePath)
      .map(r => atoms.find(a => String(a.id) === String(r.sourceId))?.name)
      .filter(Boolean) as string[];
  }, [selectedAtom, relations, atoms, filePath]);

  const internalCallees = useMemo(() => {
    if (!selectedAtom) return [];
    return relations
      .filter(r => String(r.sourceId) === String(selectedAtom.id) && r.targetFile === filePath)
      .map(r => atoms.find(a => String(a.id) === String(r.targetId))?.name)
      .filter(Boolean) as string[];
  }, [selectedAtom, relations, atoms, filePath]);

  if (atoms.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🔍</div>
        <h3>{filePath.split('/').pop()}</h3>
        <p>No atoms found for this file</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'row' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <ReactFlow
          nodes={nodes} edges={edges}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onNodeContextMenu={onNodeContextMenu}
          onNodeMouseEnter={onNodeMouseEnter}
          onNodeMouseLeave={onNodeMouseLeave}
          nodeTypes={nodeTypes}
          fitView fitViewOptions={{ padding: 0.15 }}
          minZoom={0.2} maxZoom={2.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#313244" gap={16} size={1} />
          <Controls position="bottom-left"
            style={{ background: '#1e1e2e', border: '1px solid #45475a', borderRadius: 8 }} />
        </ReactFlow>
      </div>

      {selectedAtom && (
        <div className="glass-panel" style={{ 
          width: '320px', 
          display: 'flex', flexDirection: 'column', overflowY: 'auto',
          animation: 'slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards'
        }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--fg-text)', wordBreak: 'break-all' }}>{selectedAtom.name}</h3>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--fg-overlay)', textTransform: 'capitalize' }}>
                {selectedAtom.type} • {selectedAtom.linesOfCode} lines
              </p>
            </div>
            <button 
              onClick={() => setSelectedAtomId(null)}
              style={{ background: 'transparent', border: 'none', color: 'var(--fg-overlay)', cursor: 'pointer', fontSize: '18px' }}
            >×</button>
          </div>
          
          {/* Ghost Preview Tooltip */}
          {hoveredCode && (
            <div style={{
              position: 'absolute', top: '20px', left: '20px', zIndex: 1000,
              background: 'rgba(30, 30, 46, 0.95)', border: '1px solid var(--accent-blue)',
              borderRadius: '8px', padding: '12px', width: '400px', maxHeight: '300px',
              overflow: 'hidden', pointerEvents: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(8px)', animation: 'fadeIn 0.2s ease-out'
            }}>
              <div style={{ fontSize: '10px', color: 'var(--accent-blue)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>📡 Ghost Preview • Realtime Code Scan</div>
              <pre style={{ margin: 0, fontSize: '11px', color: 'var(--fg-text)', fontFamily: 'monospace', opacity: 0.9 }}>
                {hoveredCode.code.split('\n').slice(0, 15).join('\n')}
                {hoveredCode.code.split('\n').length > 15 ? '\n...' : ''}
              </pre>
            </div>
          )}

          {/* Tab Switcher */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-mantle)' }}>
            <button 
              onClick={() => setActiveTab('details')}
              style={{ 
                flex: 1, padding: '10px', fontSize: '12px', border: 'none', 
                background: activeTab === 'details' ? 'var(--bg-surface)' : 'transparent',
                color: activeTab === 'details' ? 'var(--accent-blue)' : 'var(--fg-overlay)',
                borderBottom: activeTab === 'details' ? '2px solid var(--accent-blue)' : 'none',
                cursor: 'pointer', fontWeight: activeTab === 'details' ? 'bold' : 'normal'
              }}
            >Details</button>
            <button 
              onClick={() => setActiveTab('history')}
              style={{ 
                flex: 1, padding: '10px', fontSize: '12px', border: 'none', 
                background: activeTab === 'history' ? 'var(--bg-surface)' : 'transparent',
                color: activeTab === 'history' ? 'var(--accent-blue)' : 'var(--fg-overlay)',
                borderBottom: activeTab === 'history' ? '2px solid var(--accent-blue)' : 'none',
                cursor: 'pointer', fontWeight: activeTab === 'history' ? 'bold' : 'normal'
              }}
            >Lineage (History)</button>
          </div>

          {activeTab === 'details' ? (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {/* External Callers (Portals) */}
              {externalCallers.length > 0 && (
                <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', background: 'rgba(137, 180, 250, 0.05)' }}>
                   <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--accent-blue)', fontWeight: 'bold', marginBottom: '8px' }}>🚀 Topological Portals (External)</div>
                   {externalCallers.map((r, i) => (
                     <div 
                       key={i} 
                       onClick={() => onFileSelect && onFileSelect(r.sourceFile!, r.sourceName)}
                       style={{ 
                         fontSize: '11px', color: 'var(--fg-text)', marginBottom: '6px', 
                         cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', background: 'var(--bg-surface)',
                         border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px'
                       }}
                     >
                       <span style={{ color: 'var(--accent-blue)' }}>←</span> 
                       <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                         <strong>{r.sourceName}</strong>
                         <div style={{ fontSize: '9px', color: 'var(--fg-overlay)' }}>{r.sourceFile?.split('/').pop()}</div>
                       </div>
                     </div>
                   ))}
                </div>
              )}
              {/* Metadata semántica - Eventos y Estado */}
              {(selectedAtom.eventEmitters?.length > 0 || selectedAtom.eventListeners?.length > 0) && (
                <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', background: 'rgba(249, 226, 175, 0.05)' }}>
                   <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#f9e2af', fontWeight: 'bold', marginBottom: '8px' }}>Semantic Signals (Event Bus)</div>
                   {selectedAtom.eventEmitters?.map((e: any, i: number) => (
                     <div key={i} style={{ fontSize: '12px', color: 'var(--fg-text)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                       <span style={{ color: '#f9e2af' }}>⚡ Emit:</span> <code>{e.eventName}</code>
                     </div>
                   ))}
                   {selectedAtom.eventListeners?.map((l: any, i: number) => (
                     <div key={i} style={{ fontSize: '12px', color: 'var(--fg-text)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                       <span style={{ color: '#a6e3a1' }}>👂 Listen:</span> <code>{l.eventName}</code>
                     </div>
                   ))}
                </div>
              )}

              {/* Classification Tags */}
              <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--fg-overlay)', fontWeight: 'bold', marginBottom: '8px' }}>Classification Context</div>
                  <div style={{ fontSize: '11px', marginBottom: '12px', color: 'var(--text-color)', opacity: 0.8 }}>
                    {selectedAtom.type === 'variable' 
                      ? "Esta entidad guarda estado o configuración. Si tiene llamadas entrantes (Callers), otros componentes la observan."
                      : "Esta entidad es ejecutable. Cambios en sus líneas de código pueden propagarse hacia arriba a sus Callers."}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    <span className="stat-chip" style={{ background: 'var(--bg-crust)' }}>Purpose: {selectedAtom.type === 'variable' ? 'State / Data' : (selectedAtom.purposeType || 'Unknown')}</span>
                    <span className="stat-chip" style={{ background: 'var(--bg-crust)' }}>Centrality: {selectedAtom.centralityClass || 'Normal'}</span>
                    <span className="stat-chip" style={{ background: 'var(--bg-crust)' }}>Risk: {selectedAtom.riskLevel || 'Low'}</span>
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="glass-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 'bold' }}>⚙️ Complexity</span>
                    <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{selectedAtom.complexity}</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${Math.min(100, (selectedAtom.complexity / 15) * 100)}%`, background: selectedAtom.complexity > 10 ? '#ff4757' : '#2ed573' }} />
                  </div>
                </div>

                <div className="glass-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 'bold' }}>🧨 Fragility</span>
                    <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{Math.round(selectedAtom.fragilityScore * 100)}%</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${Math.min(100, selectedAtom.fragilityScore * 100)}%`, background: selectedAtom.fragilityScore > 0.6 ? '#ff4757' : '#2ed573' }} />
                  </div>
                </div>

                {/* In-File Dependency Context */}
                {(selectedAtom.inDegree > 0 || selectedAtom.outDegree > 0) && (
                  <div className="glass-card">
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--fg-overlay)', fontWeight: 'bold', marginBottom: '8px' }}>Internal Connections</div>
                    <div style={{ fontSize: '11px', color: '#89b4fa', marginBottom: '4px' }}>Callers: {internalCallers.length || 'None'}</div>
                    <div style={{ fontSize: '11px', color: '#f5c2e7' }}>Callees: {internalCallees.length || 'None'}</div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--accent-blue)', fontWeight: 'bold', marginBottom: '16px' }}>🧬 Evolution Lineage</div>
              {isHistoryLoading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--fg-overlay)' }}>Cargando línea de tiempo...</div>
              ) : atomHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--fg-overlay)', fontSize: '12px' }}>No se han encontrado snapshots previos para este átomo.</div>
              ) : (
                <div className="timeline" style={{ borderLeft: '2px solid var(--border)', marginLeft: '10px', paddingLeft: '20px' }}>
                  {atomHistory.map((h, i) => (
                    <div key={i} style={{ marginBottom: '24px', position: 'relative' }}>
                      <div style={{ 
                        position: 'absolute', left: '-27px', top: '4px', width: '12px', height: '12px', 
                        borderRadius: '50%', background: i === 0 ? 'var(--accent-blue)' : 'var(--border)',
                        border: '2px solid var(--bg-surface)'
                      }} />
                      <div style={{ fontSize: '10px', color: 'var(--fg-overlay)', marginBottom: '4px' }}>{new Date(h.timestamp).toLocaleString()}</div>
                      <div style={{ fontSize: '12px', color: 'var(--fg-text)', fontWeight: 'bold' }}>{h.commitMessage || 'Snapshot manual'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--fg-overlay)', fontStyle: 'italic' }}>By: {h.author || 'System'}</div>
                      <div style={{ marginTop: '6px', fontSize: '10px', color: 'var(--accent-peach)' }}>Δ {h.linesChanged || 0} lines modified</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Wrapper with ReactFlowProvider for useReactFlow access */
export function AtomExplorer(props: Props) {
  return (
    <ReactFlowProvider>
      <AtomExplorerInner {...props} />
    </ReactFlowProvider>
  );
}
