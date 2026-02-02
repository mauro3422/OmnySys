/**
 * TypeScript Type Definitions for Enhanced System Map
 * Auto-generated from enhanced-system-map.schema.json
 * Version: 0.4.0
 */

export interface EnhancedSystemMap {
  metadata: Metadata;
  files: Record<string, FileAnalysis>;
  connectionIndex?: ConnectionIndex;
}

export interface Metadata {
  version: string;
  generated: string;
  analyzers: {
    static: string;
    semantic?: string;
  };
  project?: {
    name?: string;
    path?: string;
    fileCount?: number;
  };
}

export interface FileAnalysis {
  path: string;
  displayPath?: string;
  imports: ImportStatement[];
  exports: Export[];
  calls?: Call[];
  identifierRefs?: string[];
  usedBy?: string[];
  dependsOn?: string[];
  semanticConnections?: SemanticConnection[];
  sideEffects?: SideEffects;
  riskScore?: RiskScore;
  analysis?: AnalysisStatus;
}

export interface ImportStatement {
  source: string;
  specifiers: ImportSpecifier[];
  resolved?: string | null;
}

export interface ImportSpecifier {
  type: 'named' | 'default' | 'namespace' | 'side-effect';
  imported?: string;
  local?: string;
}

export interface Export {
  type: 'function' | 'const' | 'let' | 'var' | 'class' | 'default';
  name: string;
}

export interface Call {
  name: string;
  line?: number;
}

export interface SemanticConnection {
  id: string;
  type: 'shared_state' | 'event_listener' | 'callback' | 'side_effect' | 'global_access' | 'mutation';
  target: string;
  reason: string;
  confidence: number; // 0-1
  severity?: 'low' | 'medium' | 'high' | 'critical';
  sourceLocations?: CodeLocation[];
  targetLocations?: CodeLocation[];
  evidence?: {
    sourceCode?: string;
    targetCode?: string;
  };
  detectedBy?: string;
  detectedAt?: string;
  validated?: boolean;
}

export interface CodeLocation {
  function?: string;
  line: number;
  column?: number;
}

export interface SideEffects {
  hasGlobalAccess?: boolean;
  modifiesDOM?: boolean;
  makesNetworkCalls?: boolean;
  usesLocalStorage?: boolean;
  accessesWindow?: boolean;
  modifiesGlobalState?: boolean;
  hasEventListeners?: boolean;
  usesTimers?: boolean;
}

export interface RiskScore {
  total: number; // 0-10
  breakdown?: {
    staticComplexity?: number;
    semanticConnections?: number;
    hotspotRisk?: number;
    sideEffectRisk?: number;
  };
}

export interface AnalysisStatus {
  staticAnalyzed: boolean;
  semanticAnalyzed?: boolean;
  lastSemanticAnalysis?: string | null;
  needsReanalysis?: boolean;
  errors?: Array<{
    type?: string;
    message?: string;
    timestamp?: string;
  }>;
}

export interface ConnectionIndex {
  by_type?: Record<string, string[]>;
  by_file?: Record<string, string[]>;
  by_severity?: {
    critical?: string[];
    high?: string[];
    medium?: string[];
    low?: string[];
  };
}
