/**
 * semantic-issues-detector.js
 * Detecta problemas en el código usando información semántica
 *
 * Esta es la parte CLAVE: usar las conexiones semánticas para encontrar
 * errores que el análisis estático por sí solo no puede detectar.
 *
 * Casos detectados:
 * 1. Archivos HUÉRFANOS con side effects (sospechoso)
 * 2. Eventos emitidos pero SIN LISTENERS (posible error)
 * 3. Shared state leído pero NUNCA ESCRITO (undefined)
 * 4. Shared state escrito pero NUNCA LEÍDO (código muerto)
 * 5. Conexiones indirectas NO DOCUMENTADAS
 * 6. Archivos con alta complejidad de conexiones (risk hotspots)
 */

/**
 * Detecta problemas semánticos en el análisis
 * @param {object} enrichedResults - Resultados del análisis enriquecido
 * @returns {object} - Reporte de issues encontrados
 */
export function detectSemanticIssues(enrichedResults) {
  const issues = {
    orphanedFilesWithSideEffects: [],
    unhandledEvents: [],
    undefinedSharedState: [],
    deadSharedState: [],
    connectionHotspots: [],
    suspiciousPatterns: []
  };

  // Preparar índices globales
  const globalState = buildGlobalState(enrichedResults);

  // 1. Archivos huérfanos con side effects
  issues.orphanedFilesWithSideEffects = detectOrphanedFiles(enrichedResults);

  // 2. Eventos sin listeners
  issues.unhandledEvents = detectUnhandledEvents(globalState);

  // 3. Shared state sin write
  issues.undefinedSharedState = detectUndefinedSharedState(globalState);

  // 4. Shared state sin reads (código muerto)
  issues.deadSharedState = detectDeadSharedState(globalState);

  // 5. Connection hotspots (archivos con muchas conexiones)
  issues.connectionHotspots = detectConnectionHotspots(enrichedResults);

  // 6. Patrones sospechosos
  issues.suspiciousPatterns = detectSuspiciousPatterns(enrichedResults);

  // Calcular estadísticas
  const stats = {
    totalIssues:
      issues.orphanedFilesWithSideEffects.length +
      issues.unhandledEvents.length +
      issues.undefinedSharedState.length +
      issues.deadSharedState.length +
      issues.connectionHotspots.length +
      issues.suspiciousPatterns.length,
    bySeverity: {
      high: 0,
      medium: 0,
      low: 0
    }
  };

  // Contar por severidad
  Object.values(issues).flat().forEach(issue => {
    if (issue.severity) {
      stats.bySeverity[issue.severity]++;
    }
  });

  return {
    issues,
    stats,
    timestamp: Date.now()
  };
}

/**
 * Construye índices globales de estado compartido y eventos
 * @private
 */
function buildGlobalState(enrichedResults) {
  const state = {
    sharedState: {
      reads: {},   // { "window.gameState": ["FileA.js", "FileB.js"] }
      writes: {}   // { "window.gameState": ["FileC.js"] }
    },
    events: {
      emitters: {},  // { "user:login": ["Button.js"] }
      listeners: {}  // { "user:login": ["Analytics.js"] }
    },
    files: {}
  };

  for (const [filePath, analysis] of Object.entries(enrichedResults.files || {})) {
    const semantic = analysis.semanticAnalysis || {};

    // Indexar shared state
    if (semantic.sharedState) {
      (semantic.sharedState.reads || []).forEach(prop => {
        state.sharedState.reads[prop] = state.sharedState.reads[prop] || [];
        state.sharedState.reads[prop].push(filePath);
      });

      (semantic.sharedState.writes || []).forEach(prop => {
        state.sharedState.writes[prop] = state.sharedState.writes[prop] || [];
        state.sharedState.writes[prop].push(filePath);
      });
    }

    // Indexar eventos
    if (semantic.eventPatterns) {
      (semantic.eventPatterns.eventEmitters || []).forEach(event => {
        state.events.emitters[event] = state.events.emitters[event] || [];
        state.events.emitters[event].push(filePath);
      });

      (semantic.eventPatterns.eventListeners || []).forEach(event => {
        state.events.listeners[event] = state.events.listeners[event] || [];
        state.events.listeners[event].push(filePath);
      });
    }

    // Guardar referencia al análisis completo
    state.files[filePath] = analysis;
  }

  return state;
}

/**
 * Detecta archivos huérfanos con side effects (alta prioridad)
 * @private
 */
function detectOrphanedFiles(enrichedResults) {
  const issues = [];

  for (const [filePath, analysis] of Object.entries(enrichedResults.files || {})) {
    const isOrphan =
      (analysis.imports || []).length === 0 &&
      (analysis.usedBy || []).length === 0;

    if (!isOrphan) continue;

    const semantic = analysis.semanticAnalysis || {};
    const sideEffects = semantic.sideEffects || {};

    // Casos sospechosos
    if (sideEffects.hasGlobalAccess) {
      issues.push({
        type: 'orphan-with-global-access',
        file: filePath,
        severity: 'high',
        reason: 'File has no imports/exports but modifies global state',
        evidence: {
          sharedStateWrites: semantic.sharedState?.writes || [],
          sharedStateReads: semantic.sharedState?.reads || []
        }
      });
    } else if (sideEffects.usesLocalStorage) {
      issues.push({
        type: 'orphan-with-localstorage',
        file: filePath,
        severity: 'medium',
        reason: 'File has no imports/exports but uses localStorage',
        evidence: {
          hasLocalStorage: true
        }
      });
    } else if (semantic.eventPatterns) {
      const hasEvents =
        (semantic.eventPatterns.eventEmitters || []).length > 0 ||
        (semantic.eventPatterns.eventListeners || []).length > 0;

      if (hasEvents) {
        issues.push({
          type: 'orphan-with-events',
          file: filePath,
          severity: 'medium',
          reason: 'File has no imports/exports but emits/listens to events',
          evidence: {
            events: {
              emits: semantic.eventPatterns.eventEmitters || [],
              listens: semantic.eventPatterns.eventListeners || []
            }
          }
        });
      }
    }
  }

  return issues;
}

/**
 * Detecta eventos emitidos pero sin listeners
 * @private
 */
function detectUnhandledEvents(globalState) {
  const issues = [];

  for (const [eventName, emitters] of Object.entries(globalState.events.emitters)) {
    const listeners = globalState.events.listeners[eventName];

    if (!listeners || listeners.length === 0) {
      issues.push({
        type: 'unhandled-event',
        event: eventName,
        emitters,
        severity: 'medium',
        reason: `Event "${eventName}" is emitted but no listeners found`,
        suggestion: 'Add listener or remove unused emit'
      });
    }
  }

  return issues;
}

/**
 * Detecta shared state leído pero nunca escrito (undefined)
 * @private
 */
function detectUndefinedSharedState(globalState) {
  const issues = [];

  for (const [property, readers] of Object.entries(globalState.sharedState.reads)) {
    const writers = globalState.sharedState.writes[property];

    if (!writers || writers.length === 0) {
      issues.push({
        type: 'undefined-shared-state',
        property,
        readers,
        severity: 'high',
        reason: `Property "${property}" is read but never written`,
        suggestion: 'Initialize this property or fix typo in property name'
      });
    }
  }

  return issues;
}

/**
 * Detecta shared state escrito pero nunca leído (código muerto)
 * @private
 */
function detectDeadSharedState(globalState) {
  const issues = [];

  for (const [property, writers] of Object.entries(globalState.sharedState.writes)) {
    const readers = globalState.sharedState.reads[property];

    if (!readers || readers.length === 0) {
      issues.push({
        type: 'dead-shared-state',
        property,
        writers,
        severity: 'low',
        reason: `Property "${property}" is written but never read`,
        suggestion: 'Remove unused code or add reader'
      });
    }
  }

  return issues;
}

/**
 * Detecta archivos con muchas conexiones (hotspots de riesgo)
 * @private
 */
function detectConnectionHotspots(enrichedResults) {
  const issues = [];

  for (const [filePath, analysis] of Object.entries(enrichedResults.files || {})) {
    const connectionCount =
      (analysis.imports || []).length +
      (analysis.usedBy || []).length +
      (analysis.semanticAnalysis?.sharedState?.reads?.length || 0) +
      (analysis.semanticAnalysis?.sharedState?.writes?.length || 0) +
      (analysis.semanticAnalysis?.eventPatterns?.eventEmitters?.length || 0) +
      (analysis.semanticAnalysis?.eventPatterns?.eventListeners?.length || 0);

    // Si tiene más de 10 conexiones, es un hotspot
    if (connectionCount > 10) {
      issues.push({
        type: 'connection-hotspot',
        file: filePath,
        connectionCount,
        severity: connectionCount > 20 ? 'high' : 'medium',
        reason: `File has ${connectionCount} connections (high coupling)`,
        breakdown: {
          imports: (analysis.imports || []).length,
          usedBy: (analysis.usedBy || []).length,
          sharedStateReads: (analysis.semanticAnalysis?.sharedState?.reads?.length || 0),
          sharedStateWrites: (analysis.semanticAnalysis?.sharedState?.writes?.length || 0),
          eventEmitters: (analysis.semanticAnalysis?.eventPatterns?.eventEmitters?.length || 0),
          eventListeners: (analysis.semanticAnalysis?.eventPatterns?.eventListeners?.length || 0)
        },
        suggestion: 'Consider refactoring to reduce coupling'
      });
    }
  }

  return issues.sort((a, b) => b.connectionCount - a.connectionCount);
}

/**
 * Detecta patrones sospechosos
 * @private
 */
function detectSuspiciousPatterns(enrichedResults) {
  const issues = [];

  for (const [filePath, analysis] of Object.entries(enrichedResults.files || {})) {
    const semantic = analysis.semanticAnalysis || {};

    // Patrón 1: Escribe en shared state pero no tiene imports (sospechoso)
    const hasSharedStateWrites = (semantic.sharedState?.writes?.length || 0) > 0;
    const hasNoImports = (analysis.imports || []).length === 0;
    const hasNoUsedBy = (analysis.usedBy || []).length === 0;

    if (hasSharedStateWrites && hasNoImports && !hasNoUsedBy) {
      issues.push({
        type: 'isolated-state-writer',
        file: filePath,
        severity: 'medium',
        reason: 'File writes to global state but has no imports',
        evidence: {
          writes: semantic.sharedState.writes
        },
        suggestion: 'This file may be modifying state without proper initialization'
      });
    }

    // Patrón 2: LLM detectó conexiones con baja confianza
    if (analysis.llmInsights?.confidence < 0.85) {
      issues.push({
        type: 'low-confidence-analysis',
        file: filePath,
        severity: 'low',
        confidence: analysis.llmInsights.confidence,
        reason: 'LLM analysis has low confidence on this file',
        suggestion: 'Manual review recommended'
      });
    }

    // Patrón 3: Muchos side effects diferentes (God Object?)
    const sideEffectCount = Object.values(semantic.sideEffects || {}).filter(Boolean).length;
    if (sideEffectCount >= 4) {
      issues.push({
        type: 'many-side-effects',
        file: filePath,
        severity: 'medium',
        sideEffectCount,
        reason: 'File has many different side effects (possible God Object)',
        evidence: semantic.sideEffects,
        suggestion: 'Consider splitting responsibilities'
      });
    }
  }

  return issues;
}

/**
 * Genera reporte legible de issues
 * @param {object} issuesReport - Resultado de detectSemanticIssues
 * @returns {string} - Reporte formateado
 */
export function generateIssuesReport(issuesReport) {
  const { issues, stats } = issuesReport;
  const lines = [];

  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('  SEMANTIC ISSUES REPORT');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`Total Issues: ${stats.totalIssues}`);
  lines.push(`  High:   ${stats.bySeverity.high}`);
  lines.push(`  Medium: ${stats.bySeverity.medium}`);
  lines.push(`  Low:    ${stats.bySeverity.low}`);
  lines.push('');

  // Orphaned Files
  if (issues.orphanedFilesWithSideEffects.length > 0) {
    lines.push('───────────────────────────────────────────────────────────');
    lines.push('⚠️  ORPHANED FILES WITH SIDE EFFECTS');
    lines.push('───────────────────────────────────────────────────────────');
    issues.orphanedFilesWithSideEffects.forEach(issue => {
      lines.push(`\n[${issue.severity.toUpperCase()}] ${issue.file}`);
      lines.push(`  ${issue.reason}`);
      if (issue.evidence.sharedStateWrites?.length > 0) {
        lines.push(`  Writes: ${issue.evidence.sharedStateWrites.join(', ')}`);
      }
      if (issue.evidence.sharedStateReads?.length > 0) {
        lines.push(`  Reads: ${issue.evidence.sharedStateReads.join(', ')}`);
      }
    });
    lines.push('');
  }

  // Unhandled Events
  if (issues.unhandledEvents.length > 0) {
    lines.push('───────────────────────────────────────────────────────────');
    lines.push('⚠️  UNHANDLED EVENTS');
    lines.push('───────────────────────────────────────────────────────────');
    issues.unhandledEvents.forEach(issue => {
      lines.push(`\n[${issue.severity.toUpperCase()}] Event: "${issue.event}"`);
      lines.push(`  Emitted by: ${issue.emitters.join(', ')}`);
      lines.push(`  ${issue.reason}`);
      lines.push(`  💡 ${issue.suggestion}`);
    });
    lines.push('');
  }

  // Undefined Shared State
  if (issues.undefinedSharedState.length > 0) {
    lines.push('───────────────────────────────────────────────────────────');
    lines.push('⚠️  UNDEFINED SHARED STATE');
    lines.push('───────────────────────────────────────────────────────────');
    issues.undefinedSharedState.forEach(issue => {
      lines.push(`\n[${issue.severity.toUpperCase()}] Property: "${issue.property}"`);
      lines.push(`  Read by: ${issue.readers.join(', ')}`);
      lines.push(`  ${issue.reason}`);
      lines.push(`  💡 ${issue.suggestion}`);
    });
    lines.push('');
  }

  // Dead Shared State
  if (issues.deadSharedState.length > 0) {
    lines.push('───────────────────────────────────────────────────────────');
    lines.push('⚠️  DEAD SHARED STATE (Never Read)');
    lines.push('───────────────────────────────────────────────────────────');
    issues.deadSharedState.forEach(issue => {
      lines.push(`\n[${issue.severity.toUpperCase()}] Property: "${issue.property}"`);
      lines.push(`  Written by: ${issue.writers.join(', ')}`);
      lines.push(`  ${issue.reason}`);
      lines.push(`  💡 ${issue.suggestion}`);
    });
    lines.push('');
  }

  // Connection Hotspots
  if (issues.connectionHotspots.length > 0) {
    lines.push('───────────────────────────────────────────────────────────');
    lines.push('⚠️  CONNECTION HOTSPOTS (High Coupling)');
    lines.push('───────────────────────────────────────────────────────────');
    issues.connectionHotspots.slice(0, 5).forEach(issue => {
      lines.push(`\n[${issue.severity.toUpperCase()}] ${issue.file}`);
      lines.push(`  Total Connections: ${issue.connectionCount}`);
      lines.push(`  Breakdown:`);
      lines.push(`    Imports: ${issue.breakdown.imports}`);
      lines.push(`    Used By: ${issue.breakdown.usedBy}`);
      lines.push(`    Shared State Reads: ${issue.breakdown.sharedStateReads}`);
      lines.push(`    Shared State Writes: ${issue.breakdown.sharedStateWrites}`);
      lines.push(`    Event Emitters: ${issue.breakdown.eventEmitters}`);
      lines.push(`    Event Listeners: ${issue.breakdown.eventListeners}`);
      lines.push(`  💡 ${issue.suggestion}`);
    });
    if (issues.connectionHotspots.length > 5) {
      lines.push(`\n... and ${issues.connectionHotspots.length - 5} more`);
    }
    lines.push('');
  }

  // Suspicious Patterns
  if (issues.suspiciousPatterns.length > 0) {
    lines.push('───────────────────────────────────────────────────────────');
    lines.push('⚠️  SUSPICIOUS PATTERNS');
    lines.push('───────────────────────────────────────────────────────────');
    issues.suspiciousPatterns.forEach(issue => {
      lines.push(`\n[${issue.severity.toUpperCase()}] ${issue.file}`);
      lines.push(`  Type: ${issue.type}`);
      lines.push(`  ${issue.reason}`);
      if (issue.suggestion) {
        lines.push(`  💡 ${issue.suggestion}`);
      }
    });
    lines.push('');
  }

  lines.push('═══════════════════════════════════════════════════════════');

  return lines.join('\n');
}
