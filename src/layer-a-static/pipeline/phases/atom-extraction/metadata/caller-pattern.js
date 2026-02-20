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

/**
 * Detecta el patrón de llamada de un átomo
 * @param {Object} atom - El átomo con metadata
 * @param {string} filePath - Ruta del archivo
 * @returns {Object} - { pattern, reason, confidence }
 */
export function detectCallerPattern(atom, filePath = '') {
  const calledByCount = atom.calledBy?.length || 0;
  
  // 1. Si tiene calledBy, es llamada directa
  if (calledByCount > 0) {
    return {
      pattern: CALLER_PATTERNS.DIRECT_CALL,
      reason: `Called by ${calledByCount} caller(s)`,
      confidence: 1.0
    };
  }
  
  // 2. Archived code
  if (filePath.startsWith('archive/')) {
    return {
      pattern: CALLER_PATTERNS.ARCHIVED,
      reason: 'Code in archive directory',
      confidence: 1.0
    };
  }
  
  // 3. Class method - llamado via instancia
  if (atom.className || atom.functionType === 'method' || atom.archetype?.type === 'class-method') {
    return {
      pattern: CALLER_PATTERNS.CLASS_INSTANCE,
      reason: `Method of class ${atom.className || 'unknown'}`,
      confidence: 0.95
    };
  }
  
  // 4. Test helper - llamado por framework
  if (filePath.includes('.test.') || filePath.includes('.spec.') || 
      filePath.includes('/tests/') || filePath.includes('__tests__/') ||
      filePath.includes('test-cases/') || filePath.startsWith('test-')) {
    return {
      pattern: CALLER_PATTERNS.TEST_FRAMEWORK,
      reason: 'Function in test file (called by test framework)',
      confidence: 1.0
    };
  }
  
  // 5. Script constant or entry point
  if (filePath.startsWith('scripts/') || filePath === 'install.js' || filePath.startsWith('install/')) {
    // Constants like ROOT_PATH, __dirname, etc.
    if (atom.archetype?.type === 'constant' || atom.archetype?.type === 'config') {
      return {
        pattern: CALLER_PATTERNS.SCRIPT_CONSTANT,
        reason: 'Internal script constant',
        confidence: 0.95
      };
    }
    // Script entry point
    if (atom.name === 'main' || atom.isExported === false) {
      return {
        pattern: CALLER_PATTERNS.ENTRY_POINT,
        reason: 'Script entry point',
        confidence: 0.95
      };
    }
  }
  
  // 6. CLI command
  if (filePath.includes('/cli/commands/') && atom.isExported) {
    return {
      pattern: CALLER_PATTERNS.CLI_COMMAND,
      reason: 'CLI command (registered in CLI router)',
      confidence: 0.9
    };
  }
  
  // 7. Event callback - tiene temporal patterns de events
  if (atom.temporal?.patterns?.events?.length > 0 || 
      atom.hasEventListeners || 
      atom.lifecycleHooks?.length > 0) {
    return {
      pattern: CALLER_PATTERNS.EVENT_CALLBACK,
      reason: 'Has event listeners or lifecycle hooks',
      confidence: 0.85
    };
  }
  
  // 8. Archetype dead-function
  if (atom.archetype?.type === 'dead-function') {
    return {
      pattern: CALLER_PATTERNS.TRULY_DEAD,
      reason: 'Archetype classified as dead-function',
      confidence: 0.9
    };
  }
  
  // 9. Purpose DEAD_CODE
  if (atom.purpose === 'DEAD_CODE') {
    return {
      pattern: CALLER_PATTERNS.TRULY_DEAD,
      reason: 'Purpose classified as DEAD_CODE',
      confidence: 0.85
    };
  }
  
  // 10. Internal constant (not exported, archetype constant/config)
  if (!atom.isExported && (atom.archetype?.type === 'constant' || atom.archetype?.type === 'config')) {
    return {
      pattern: CALLER_PATTERNS.INTERNAL_CONSTANT,
      reason: 'Internal constant (file scope)',
      confidence: 0.9
    };
  }
  
  // 11. Exportado pero sin callers - podría ser entry point o re-export
  if (atom.isExported) {
    // Check si es un archivo "index" que re-exporta
    if (filePath.endsWith('/index.js') || filePath.includes('/index.ts')) {
      return {
        pattern: CALLER_PATTERNS.RE_EXPORT,
        reason: 'Exported from index file (likely re-export)',
        confidence: 0.7
      };
    }
    
    // Handler/controller pattern
    if (atom.name.includes('Handler') || atom.name.includes('Controller') || 
        atom.name.includes('Route') || atom.name.includes('Middleware')) {
      return {
        pattern: CALLER_PATTERNS.ENTRY_POINT,
        reason: 'Handler/Controller pattern (entry point)',
        confidence: 0.85
      };
    }
    
    // Default: re-export o entry point
    return {
      pattern: CALLER_PATTERNS.ENTRY_POINT,
      reason: 'Exported but no callers detected (entry point)',
      confidence: 0.6
    };
  }
  
  // 12. Dynamic import hint
  if (atom.temporal?.patterns?.asyncPatterns?.includes?.('dynamic-import')) {
    return {
      pattern: CALLER_PATTERNS.DYNAMIC_IMPORT,
      reason: 'Loaded via dynamic import',
      confidence: 0.8
    };
  }
  
  // Default: unknown
  return {
    pattern: CALLER_PATTERNS.UNKNOWN,
    reason: 'Could not determine caller pattern',
    confidence: 0.3
  };
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
