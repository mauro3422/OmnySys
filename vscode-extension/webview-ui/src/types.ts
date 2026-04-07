/* ── Shared types for OmnySystem Explorer webview ── */

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
}

export interface AtomRelation {
  sourceId: string;
  targetId: string;
  relationType: string;
  weight: number;
  lineNumber: number;
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

export interface VsCodeMessage {
  type: string;
  data?: any;
  requestId?: string;
  error?: string;
  filePath?: string;
}
