/**
 * Configuración de CogniSystem
 */

export const EXTENSION_ID = 'cognisystem';

export const COMMANDS = {
  ANALYZE_PROJECT: `${EXTENSION_ID}.analyzeProject`,
  SHOW_GRAPH: `${EXTENSION_ID}.showGraph`,
  SHOW_IMPACT_MAP: `${EXTENSION_ID}.showImpactMap`,
  REFRESH: `${EXTENSION_ID}.refresh`,
} as const;

export const VIEWS = {
  PANEL: `${EXTENSION_ID}Panel`,
} as const;

export const CONFIG_KEYS = {
  AUTO_ANALYZE: `${EXTENSION_ID}.autoAnalyzeOnOpen`,
  SHOW_HIGH_RISK: `${EXTENSION_ID}.showHighRiskIndicator`,
  GRAPH_LAYOUT: `${EXTENSION_ID}.graph.layout`,
} as const;

export const CONTEXT_KEYS = {
  ENABLED: `${EXTENSION_ID}:enabled`,
} as const;

export const DEFAULT_LAYOUT = 'cose';

export const RISK_COLORS = {
  critical: '#ff4444',
  high: '#ff8844',
  medium: '#ffcc44',
  low: '#44ff44',
} as const;

export const SEVERITY_ICONS: Record<string, string> = {
  critical: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '🟢',
};
