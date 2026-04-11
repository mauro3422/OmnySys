/**
 * FileTree — Visual folder/file structure explorer
 * Shows the project's file hierarchy with risk indicators,
 * atom counts, and complexity metrics per file.
 */
import { useState, useMemo } from 'react';
import type { FileInfo } from '../types';

interface Props {
  files: FileInfo[];
  selectedFile: string | null;
  onFileSelect: (filePath: string) => void;
}

interface TreeNode {
  name: string;
  fullPath: string;
  isFolder: boolean;
  children: TreeNode[];
  file?: FileInfo;
  totalAtoms: number;
  totalComplexity: number;
  maxRisk: string;
  fileCount: number;
}

const riskColors: Record<string, string> = {
  critical: '#ff4757', high: '#ff6b6b', medium: '#ffa502', low: '#2ed573',
};

const riskOrder: Record<string, number> = {
  critical: 4, high: 3, medium: 2, low: 1,
};

const cultureIcons: Record<string, string> = {
  citizen: '📄', auditor: '🔍', gatekeeper: '🛡️',
  law: '⚖️', entrypoint: '🚀', script: '⚙️', unknown: '📄',
};

function buildTree(files: FileInfo[]): TreeNode {
  const root: TreeNode = {
    name: 'root', fullPath: '', isFolder: true,
    children: [], totalAtoms: 0, totalComplexity: 0, maxRisk: 'low', fileCount: 0,
  };

  for (const file of files) {
    const parts = file.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const isLast = i === parts.length - 1;
      const partName = parts[i];

      if (isLast) {
        current.children.push({
          name: partName, fullPath: file.path, isFolder: false,
          children: [], file, totalAtoms: file.atomCount,
          totalComplexity: file.totalComplexity,
          maxRisk: file.riskLevel, fileCount: 1,
        });
      } else {
        let folder = current.children.find(c => c.isFolder && c.name === partName);
        if (!folder) {
          folder = {
            name: partName, fullPath: parts.slice(0, i + 1).join('/'),
            isFolder: true, children: [], totalAtoms: 0, totalComplexity: 0,
            maxRisk: 'low', fileCount: 0,
          };
          current.children.push(folder);
        }
        current = folder;
      }
    }
  }

  // Aggregate stats upward
  function aggregate(node: TreeNode) {
    if (!node.isFolder) return;
    node.totalAtoms = 0;
    node.totalComplexity = 0;
    node.fileCount = 0;
    let maxRiskLevel = 0;

    for (const child of node.children) {
      aggregate(child);
      node.totalAtoms += child.totalAtoms;
      node.totalComplexity += child.totalComplexity;
      node.fileCount += child.fileCount;
      const childRisk = riskOrder[child.maxRisk] || 0;
      if (childRisk > maxRiskLevel) {
        maxRiskLevel = childRisk;
        node.maxRisk = child.maxRisk;
      }
    }

    // Sort: folders first, then by risk desc
    node.children.sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
      return (riskOrder[b.maxRisk] || 0) - (riskOrder[a.maxRisk] || 0);
    });
  }

  aggregate(root);
  return root;
}

function TreeNodeRow({ node, depth, selectedFile, onFileSelect, expandedPaths, toggleExpand, isSearching }: {
  node: TreeNode;
  depth: number;
  selectedFile: string | null;
  onFileSelect: (path: string) => void;
  expandedPaths: Set<string>;
  toggleExpand: (path: string) => void;
  isSearching: boolean;
}) {
  const isExpanded = isSearching || expandedPaths.has(node.fullPath);
  const isSelected = node.fullPath === selectedFile;
  const riskColor = riskColors[node.maxRisk] || '#585b70';
  const indent = depth * 16;

  return (
    <>
      <div
        className={`tree-row ${isSelected ? 'selected' : ''} ${node.isFolder ? 'folder' : 'file'}`}
        style={{ paddingLeft: indent + 8 }}
        onClick={() => {
          if (node.isFolder) {
            toggleExpand(node.fullPath);
          } else {
            onFileSelect(node.fullPath);
          }
        }}
      >
        {/* Expand arrow or file icon */}
        <span className="tree-icon">
          {node.isFolder ? (
            <span className={`folder-arrow ${isExpanded ? 'expanded' : ''}`}>▸</span>
          ) : (
            <span>{cultureIcons[node.file?.culture || 'unknown']}</span>
          )}
        </span>

        {/* Name */}
        <span className="tree-name" title={node.fullPath}>
          {node.isFolder ? (
            <>{node.name}<span className="tree-count">{node.fileCount}</span></>
          ) : (
            node.name
          )}
        </span>

        {/* Metrics */}
        <span className="tree-metrics">
          {node.totalAtoms > 0 && (
            <span className="tree-badge atoms" title={`${node.totalAtoms} atoms`}>
              ⚛ {node.totalAtoms}
            </span>
          )}
          {node.totalComplexity > 0 && (
            <span className="tree-badge complexity" title={`Complexity: ${node.totalComplexity}`}>
              🧠 {node.totalComplexity}
            </span>
          )}
          {!node.isFolder && node.file && (
            <span className="tree-badge risk" style={{ color: riskColor, borderColor: `${riskColor}44` }}
              title={`Risk: ${node.file.riskLevel} (${Math.round(node.file.riskScore)})`}>
              {node.file.riskLevel === 'high' || node.file.riskLevel === 'critical' ? '🔴' :
               node.file.riskLevel === 'medium' ? '🟡' : '🟢'}
            </span>
          )}
          {!node.isFolder && node.file?.avgFragility != null && node.file.avgFragility > 0.3 && (
            <span className="tree-badge fragility" title={`Fragility: ${Math.round(node.file.avgFragility * 100)}%`}>
              💥 {Math.round(node.file.avgFragility * 100)}%
            </span>
          )}
        </span>

        {/* Risk bar */}
        {node.isFolder && (
          <span className="tree-risk-bar">
            <span className="tree-risk-fill" style={{
              width: `${Math.min(100, node.totalComplexity / 3)}%`,
              background: riskColor,
            }} />
          </span>
        )}
      </div>

      {/* Children */}
      {node.isFolder && isExpanded && node.children.map(child => (
        <TreeNodeRow
          key={child.fullPath}
          node={child}
          depth={depth + 1}
          selectedFile={selectedFile}
          onFileSelect={onFileSelect}
          expandedPaths={expandedPaths}
          toggleExpand={toggleExpand}
          isSearching={isSearching}
        />
      ))}
    </>
  );
}

export function FileTree({ files, selectedFile, onFileSelect }: Props) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFiles = useMemo(() => {
    if (!searchTerm) return files;
    const lower = searchTerm.toLowerCase();
    return files.filter(f => f.path.toLowerCase().includes(lower));
  }, [files, searchTerm]);

  const tree = useMemo(() => buildTree(filteredFiles), [filteredFiles]);

  // Start with top-level folders expanded
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    initial.add('');
    tree.children.forEach(c => {
      if (c.isFolder) initial.add(c.fullPath);
    });
    return initial;
  });

  const toggleExpand = (path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  if (files.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📂</div>
        <h3>No Files</h3>
        <p>Load db or connect to MCP</p>
      </div>
    );
  }

  return (
    <div className="file-tree">
      <div className="file-tree-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>📂 System Structure</span>
          <span className="file-tree-count">{filteredFiles.length} files</span>
        </div>
        <input 
          type="search" 
          placeholder="Search files..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '4px 8px', borderRadius: '4px', border: '1px solid #45475a', background: '#181825', color: '#cdd6f4' }}
        />
      </div>
      <div className="file-tree-body">
        {tree.children.map(child => (
          <TreeNodeRow
            key={child.fullPath}
            node={child}
            depth={0}
            selectedFile={selectedFile}
            onFileSelect={onFileSelect}
            expandedPaths={expandedPaths}
            toggleExpand={toggleExpand}
            isSearching={!!searchTerm}
          />
        ))}
      </div>
    </div>
  );
}
