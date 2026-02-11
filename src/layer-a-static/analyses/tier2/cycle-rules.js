/**
 * Cycle Rules - Reglas moleculares de clasificación (SSOT)
 * 
 * Única fuente de verdad para reglas de clasificación de ciclos.
 * Cada regla es pura y testeable individualmente.
 * 
 * @module cycle-rules
 */

export const CYCLE_RULES = [
  {
    id: 'event-driven-cycle',
    name: 'Event-Driven Architecture',
    condition: (derived) => 
      derived.hasEventEmitters && 
      derived.hasEventListeners &&
      derived.eventDrivenRatio >= 0.3,
    severity: 'INFO',
    category: 'VALID_ARCHITECTURE',
    explanation: 'Patrón pub/sub válido: componentes se comunican por eventos',
    autoIgnore: true
  },
  
  {
    id: 'websocket-communication',
    name: 'WebSocket Bidirectional',
    condition: (derived) =>
      derived.hasWebSocket &&
      derived.hasNetworkCalls &&
      derived.isBidirectional,
    severity: 'INFO',
    category: 'VALID_ARCHITECTURE',
    explanation: 'Comunicación bidireccional WebSocket: patrón intencional',
    autoIgnore: true
  },
  
  {
    id: 'lifecycle-coordination',
    name: 'Lifecycle Coordination',
    condition: (derived) =>
      derived.hasLifecycleHooks &&
      (derived.hasInitialization || derived.hasCleanup) &&
      derived.cycleLength <= 4,
    severity: 'INFO', 
    category: 'VALID_ARCHITECTURE',
    explanation: 'Coordinación de lifecycle entre componentes relacionados',
    autoIgnore: true
  },
  
  {
    id: 'pure-import-cycle',
    name: 'Pure Import Cycle',
    condition: (derived) =>
      !derived.hasSideEffects &&
      !derived.hasNetworkCalls &&
      !derived.hasAsync &&
      derived.staticImportRatio === 1 &&
      derived.cycleLength === 2,
    severity: 'WARNING',
    category: 'COUPLING_ISSUE',
    explanation: 'Ciclo de imports estáticos: considerar desacoplar',
    autoIgnore: false,
    suggestion: 'Extraer interfaz común o usar inyección de dependencias'
  },
  
  {
    id: 'complex-circular-dependency',
    name: 'Complex Circular Dependency',
    condition: (derived) =>
      derived.cycleLength > 5 &&
      derived.hasStateModification &&
      derived.hasSideEffects &&
      derived.totalAtoms > 20,
    severity: 'ERROR',
    category: 'CRITICAL_ISSUE',
    explanation: 'Ciclo complejo con side effects: alto riesgo de bugs',
    autoIgnore: false,
    suggestion: 'Refactorizar usando arquitectura hexagonal'
  }
];

export function evaluateRules(derived) {
  return CYCLE_RULES
    .filter(rule => rule.condition(derived))
    .sort((a, b) => {
      const order = { ERROR: 0, WARNING: 1, INFO: 2 };
      return order[a.severity] - order[b.severity];
    });
}

export default { CYCLE_RULES, evaluateRules };
