/**
 * Tipos y interfaces de CogniSystem
 */

export interface RiskScore {
  total: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface SemanticConnection {
  type: 'shared_state' | 'event_listener' | 'side_effect' | 'global_access';
  targetFile: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
}

export interface FileData {
  path: string;
  riskScore?: RiskScore;
  usedBy?: string[];
  dependsOn?: string[];
  semanticConnections?: SemanticConnection[];
}

export interface GraphNode {
  id: string;
  label: string;
  risk: number;
  severity: string;
  connections: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'import' | 'semantic';
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ImpactMap {
  file: string;
  directlyAffects: string[];
  semanticConnections: SemanticConnection[];
  riskLevel: string;
}

export interface HighRiskFile {
  path: string;
  score: number;
  severity: string;
}
