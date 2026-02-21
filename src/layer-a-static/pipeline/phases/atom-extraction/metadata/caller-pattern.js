/**
 * @fileoverview caller-pattern.js
 *
 * Detecta el patrón de llamada de un átomo.
 * Responde: ¿POR QUÉ no tiene calledBy?
 *
 * Patrones detectados:
 * - direct_call:       Llamado directamente (tiene calledBy)
 * - class_instance:    Método llamado via instancia
 * - test_framework:    Llamado por framework de testing
 * - event_callback:    Registrado como event listener/callback
 * - cli_command:       Comando CLI registrado
 * - entry_point:       Entry point (main, handler)
 * - re_export:         Re-exportado de otro módulo
 * - dynamic_import:    Cargado dinámicamente
 * - truly_dead:        Realmente no usado
 */

export const CALLER_PATTERNS = {
  DIRECT_CALL: {
    id: 'direct_call',
    label: 'Llamada Directa',
    icon: '📞',
    description: 'Llamado directamente en el código',
    hasCallers: true
  },
  CLASS_INSTANCE: {
    id: 'class_instance',
    label: 'Instancia de Clase',
    icon: '📦',
    description: 'Método llamado via instancia de clase',
    hasCallers: false,
    reason: 'Static analysis cannot track instance.method() calls'
  },
  TEST_FRAMEWORK: {
    id: 'test_framework',
    label: 'Framework de Test',
    icon: '🧪',
    description: 'Llamado dinámicamente por describe/it/expect',
    hasCallers: false,
    reason: 'Test frameworks call functions dynamically'
  },
  EVENT_CALLBACK: {
    id: 'event_callback',
    label: 'Event Callback',
    icon: '⚡',
    description: 'Registrado como event listener o callback',
    hasCallers: false,
    reason: 'Event-driven calls are not traceable statically'
  },
  CLI_COMMAND: {
    id: 'cli_command',
    label: 'Comando CLI',
    icon: '💻',
    description: 'Comando registrado en CLI',
    hasCallers: false,
    reason: 'CLI commands are invoked by user, not code'
  },
  ENTRY_POINT: {
    id: 'entry_point',
    label: 'Entry Point',
    icon: '🚀',
    description: 'Punto de entrada (main, handler, server)',
    hasCallers: false,
    reason: 'Entry points have no callers by design'
  },
  RE_EXPORT: {
    id: 're_export',
    label: 'Re-Export',
    icon: '📤',
    description: 'Re-exportado de otro módulo',
    hasCallers: false,
    reason: 'Original caller is in another package'
  },
  DYNAMIC_IMPORT: {
    id: 'dynamic_import',
    label: 'Import Dinámico',
    icon: '🔄',
    description: 'Cargado via import() dinámico',
    hasCallers: false,
    reason: 'Dynamic imports are resolved at runtime'
  },
  TRULY_DEAD: {
    id: 'truly_dead',
    label: 'Dead Code',
    icon: '💀',
    description: 'No hay evidencia de uso',
    hasCallers: false,
    reason: 'Function is never called or exported'
  },
  SCRIPT_CONSTANT: {
    id: 'script_constant',
    label: 'Constante de Script',
    icon: '📜',
    description: 'Constante interna de script (ROOT_PATH, __dirname, etc.)',
    hasCallers: false,
    reason: 'Internal script constants are used within the script scope'
  },
  INTERNAL_CONSTANT: {
    id: 'internal_constant',
    label: 'Constante Interna',
    icon: '📝',
    description: 'Constante interna no exportada',
    hasCallers: false,
    reason: 'Internal constants are used within file scope'
  },
  ARCHIVED: {
    id: 'archived',
    label: 'Archivado',
    icon: '🗄️',
    description: 'Código archivado/histórico',
    hasCallers: false,
    reason: 'Archived code is not in active use'
  },
  UNKNOWN: {
    id: 'unknown',
    label: 'Desconocido',
    icon: '❓',
    description: 'No se pudo determinar',
    hasCallers: false,
    reason: 'Needs investigation'
  }
};

// ── File-type detection helpers ───────────────────────────────────────────────

function isTestFile(filePath) {
  return filePath.includes('.test.') || filePath.includes('.spec.') ||
    filePath.includes('/tests/') || filePath.includes('__tests__/') ||
    filePath.includes('test-cases/') || filePath.startsWith('test-');
}

function isScriptOrInstallFile(filePath) {
  return filePath.startsWith('scripts/') || filePath === 'install.js' || filePath.startsWith('install/');
}

function isClassMethod(atom) {
  return !!(atom.className || atom.functionType === 'method' || atom.archetype?.type === 'class-method');
}

function isHandlerName(name) {
  return name.includes('Handler') || name.includes('Controller') ||
    name.includes('Route') || name.includes('Middleware');
}

/**
 * Detecta el patrón de llamada de un átomo
 * @param {Object} atom - El átomo con metadata
 * @param {string} filePath - Ruta del archivo
 * @returns {Object} - { pattern, reason, confidence }
 */
export function detectCallerPattern(atom, filePath = '') {
  const calledByCount = atom.calledBy?.length || 0;

  if (calledByCount > 0) {
    return { pattern: CALLER_PATTERNS.DIRECT_CALL, reason: `Called by ${calledByCount} caller(s)`, confidence: 1.0 };
  }

  if (filePath.startsWith('archive/')) {
    return { pattern: CALLER_PATTERNS.ARCHIVED, reason: 'Code in archive directory', confidence: 1.0 };
  }

  if (isClassMethod(atom)) {
    return { pattern: CALLER_PATTERNS.CLASS_INSTANCE, reason: `Method of class ${atom.className || 'unknown'}`, confidence: 0.95 };
  }

  if (isTestFile(filePath)) {
    return { pattern: CALLER_PATTERNS.TEST_FRAMEWORK, reason: 'Function in test file (called by test framework)', confidence: 1.0 };
  }

  if (isScriptOrInstallFile(filePath)) {
    if (atom.archetype?.type === 'constant' || atom.archetype?.type === 'config') {
      return { pattern: CALLER_PATTERNS.SCRIPT_CONSTANT, reason: 'Internal script constant', confidence: 0.95 };
    }
    if (atom.name === 'main' || atom.isExported === false) {
      return { pattern: CALLER_PATTERNS.ENTRY_POINT, reason: 'Script entry point', confidence: 0.95 };
    }
  }

  if (filePath.includes('/cli/commands/') && atom.isExported) {
    return { pattern: CALLER_PATTERNS.CLI_COMMAND, reason: 'CLI command (registered in CLI router)', confidence: 0.9 };
  }

  if (atom.temporal?.patterns?.events?.length > 0 || atom.hasEventListeners || atom.lifecycleHooks?.length > 0) {
    return { pattern: CALLER_PATTERNS.EVENT_CALLBACK, reason: 'Has event listeners or lifecycle hooks', confidence: 0.85 };
  }

  if (atom.archetype?.type === 'dead-function') {
    return { pattern: CALLER_PATTERNS.TRULY_DEAD, reason: 'Archetype classified as dead-function', confidence: 0.9 };
  }

  if (atom.purpose === 'DEAD_CODE') {
    return { pattern: CALLER_PATTERNS.TRULY_DEAD, reason: 'Purpose classified as DEAD_CODE', confidence: 0.85 };
  }

  if (!atom.isExported && (atom.archetype?.type === 'constant' || atom.archetype?.type === 'config')) {
    return { pattern: CALLER_PATTERNS.INTERNAL_CONSTANT, reason: 'Internal constant (file scope)', confidence: 0.9 };
  }

  if (atom.isExported) {
    if (filePath.endsWith('/index.js') || filePath.includes('/index.ts')) {
      return { pattern: CALLER_PATTERNS.RE_EXPORT, reason: 'Exported from index file (likely re-export)', confidence: 0.7 };
    }
    if (isHandlerName(atom.name)) {
      return { pattern: CALLER_PATTERNS.ENTRY_POINT, reason: 'Handler/Controller pattern (entry point)', confidence: 0.85 };
    }
    return { pattern: CALLER_PATTERNS.ENTRY_POINT, reason: 'Exported but no callers detected (entry point)', confidence: 0.6 };
  }

  if (atom.temporal?.patterns?.asyncPatterns?.includes?.('dynamic-import')) {
    return { pattern: CALLER_PATTERNS.DYNAMIC_IMPORT, reason: 'Loaded via dynamic import', confidence: 0.8 };
  }

  return { pattern: CALLER_PATTERNS.UNKNOWN, reason: 'Could not determine caller pattern', confidence: 0.3 };
}

/**
 * Agrega callerPattern a todos los átomos
 * @param {Array} atoms - Array de átomos
 */
export function enrichWithCallerPattern(atoms) {
  for (const atom of atoms) {
    const filePath = atom.filePath || '';
    const result = detectCallerPattern(atom, filePath);
    
    atom.callerPattern = {
      id: result.pattern.id,
      label: result.pattern.label,
      icon: result.pattern.icon,
      reason: result.reason,
      hasCallers: result.pattern.hasCallers,
      confidence: result.confidence
    };
  }
}

export default { detectCallerPattern, enrichWithCallerPattern, CALLER_PATTERNS };
