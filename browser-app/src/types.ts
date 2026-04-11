/* ── Shared types for OmnySystem Explorer ── */

export interface FileInfo {
  path: string;
  displayPath: string;
  riskScore: number;
  riskLevel: string;
  culture: string;
  atomCount: number;
  totalComplexity: number;
  avgFragility?: number;
  maxPropagation?: number;
}

export interface FileDependency {
  source: string;
  target: string;
  type: string;
  isDynamic: boolean;
}

export interface SharedStateAccess {
  objectName: string;
  propertyName: string;
  accessType: 'read' | 'write' | 'both';
}

export interface EventEmitter {
  eventName: string;
  objectName: string;
  confidence: number;
}

export interface EventListener {
  eventName: string;
  objectName: string;
  confidence: number;
  pattern: string;
}

export interface AtomInfo {
  id: string;
  name: string;
  type: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  linesOfCode: number;
  complexity: number;
  isExported: boolean;
  isAsync: boolean;
  archetype: string;
  fragilityScore: number;
  couplingScore: number;
  propagationScore: number;
  centralityClass: string;
  riskLevel: string;
  inDegree: number;
  outDegree: number;
  callersCount: number;
  calleesCount: number;
  sharedState?: SharedStateAccess[];
  eventEmitters?: EventEmitter[];
  eventListeners?: EventListener[];
  dataFlow?: any;
}

export interface AtomRelation {
  sourceId: string;
  targetId: string;
  relationType: string;
  weight: number;
  lineNumber: number;
  // Expanded for topological navigation
  sourceName?: string;
  sourceFile?: string;
  targetName?: string;
  targetFile?: string;
}

export interface DbStats {
  totalAtoms: number;
  totalFiles: number;
  totalRelations: number;
  totalEvents: number;
  avgComplexity: number;
  maxComplexity: number;
}

export type ViewMode = 'graph' | 'atoms' | 'health';

export interface OmnyData {
  files: FileInfo[];
  dependencies: FileDependency[];
  stats: DbStats | null;
  activeFileAtoms: AtomInfo[];
  activeFileRelations: AtomRelation[];
  activeFilePath: string | null;
  activeSymbolName?: string | null; // For landing focus
  health: any;
  loading: boolean;
  error: string | null;
  dataSource: 'mcp' | 'demo' | 'none';
  selectFile: (path: string, symbolName?: string) => void;
}
