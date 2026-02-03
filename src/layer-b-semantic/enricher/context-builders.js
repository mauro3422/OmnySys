/**
 * context-builders.js
 * Construye contexto específico para archivos y proyectos
 */

/**
 * Construye contexto ESPECÍFICO para un archivo (archivos y funciones relacionadas)
 * ESTO es lo que el LLM necesita para hacer conexiones lógicas
 * @param {string} filePath - Archivo actual
 * @param {object} staticResults - Resultados del análisis estático
 * @param {object} projectContext - Contexto del proyecto
 * @param {object} fileMetadata - Metadatos adicionales del archivo
 * @returns {object} - Contexto específico del archivo
 */
export function buildFileSpecificContext(filePath, staticResults, projectContext = null, fileMetadata = null) {
  // =============================================================================
  // REGLA CRITICA DE ORO: SOLO CONTEXTO RELEVANTE
  // =============================================================================
  // Esta funcion construye el contexto ESPECIFICO para UN archivo.
  // NUNCA incluir todo el system-map. Solo conexiones DETECTADAS por capa A.
  //
  // Incluye:
  //   - sharedStateWith: Archivos que comparten las MISMAS variables globales
  //   - eventsConnectedTo: Archivos que usan los MISMOS eventos
  //   - imports: Solo los imports DIRECTOS de este archivo
  //   - allProjectFiles: Solo si el archivo es ORFANO (para encontrar conexiones)
  //
  // Si no hay conexiones, devuelve arrays vacios. El LLM vera "No obvious suspects"
  // y se concentrara en VALIDAR el codigo, no en buscar entre ruido.
  // =============================================================================
  
  const fileAnalysis = staticResults?.files?.[filePath];
  if (!fileAnalysis) return null;

  const context = {
    currentFile: filePath,
    relatedFiles: {
      imports: [],          // Archivos que IMPORTA
      usedBy: [],           // Archivos que lo USAN
      sharedStateWith: [],  // Archivos con shared state común
      eventsConnectedTo: [] // Archivos con eventos comunes
    },
    relatedFunctions: [],
    semanticContext: {},

    // Metadata de TODOS los archivos del proyecto
    allProjectFiles: [],

    // Contexto de subsistemas
    subsystemContext: buildSubsystemContext(filePath, projectContext),

    // Metadata adicional del archivo (JSDoc, async, errores, build flags)
    metadata: fileMetadata || {},

    // Nuevas conexiones detectadas
    connections: {
      cssInJS: fileAnalysis.cssInJSConnections || [],
      typeScript: fileAnalysis.typeScriptConnections || [],
      redux: fileAnalysis.reduxConnections || []
    }
  };

  // 1. Archivos que IMPORTA este archivo (TODOS los imports + metadatos compactos)
  // NOTA: No limitamos a 3 porque los imports directos son criticos para entender dependencias.
  // Cada import incluye metadatos compactos (exports, localStorage, eventos) para contexto.
  // FUTURO (Opcion C): Analisis por funcion podria filtrar imports relevantes por funcion.
  if (fileAnalysis.imports) {
    context.relatedFiles.imports = fileAnalysis.imports.map(imp => {
      const importPath = imp.resolvedPath || imp.source;
      const importAnalysis = staticResults?.files?.[importPath];
      
      // Metadatos compactos del archivo importado (NO su codigo completo)
      const importMetadata = {
        file: importPath,
        symbols: imp.specifiers || [],
        reason: `Imports from ${imp.source}`,
        
        // Metadatos del archivo importado (si existe analisis)
        exports: importAnalysis?.exports?.map(e => e.name)?.slice(0, 5) || [],
        hasLocalStorage: importAnalysis?.sideEffects?.usesLocalStorage || false,
        hasGlobalAccess: importAnalysis?.sideEffects?.hasGlobalAccess || false,
        localStorageKeys: importAnalysis?.semanticAnalysis?.sharedState?.writes?.slice(0, 3) || [],
        eventEmitters: importAnalysis?.semanticAnalysis?.eventPatterns?.eventEmitters?.slice(0, 3) || [],
        eventListeners: importAnalysis?.semanticAnalysis?.eventPatterns?.eventListeners?.slice(0, 3) || []
      };
      
      return importMetadata;
    });
  }

  // 2. Archivos que USAN este archivo (con exports que usan)
  if (fileAnalysis.usedBy) {
    context.relatedFiles.usedBy = fileAnalysis.usedBy.map(file => ({
      file,
      exportsUsed: fileAnalysis.exports || [],
      reason: `Used by ${file}`
    }));
  }

  // 3. Archivos con SHARED STATE relacionado (conexiones no obvias!)
  const sharedState = fileAnalysis.semanticAnalysis?.sharedState;
  if (sharedState) {
    const { reads = [], writes = [] } = sharedState;
    const sharedProps = [...new Set([...reads, ...writes])];

    // Buscar otros archivos que usan las mismas propiedades globales
    for (const [otherFile, otherAnalysis] of Object.entries(staticResults.files || {})) {
      if (otherFile === filePath) continue;

      const otherShared = otherAnalysis.semanticAnalysis?.sharedState || {};
      const otherReads = otherShared.reads || [];
      const otherWrites = otherShared.writes || [];
      const otherProps = [...new Set([...otherReads, ...otherWrites])];

      const commonProps = sharedProps.filter(p => otherProps.includes(p));
      if (commonProps.length > 0) {
        context.relatedFiles.sharedStateWith.push({
          file: otherFile,
          sharedProperties: commonProps,
          thisFileAccess: {
            reads: reads.filter(r => commonProps.includes(r)),
            writes: writes.filter(w => commonProps.includes(w))
          },
          otherFileAccess: {
            reads: otherReads.filter(r => commonProps.includes(r)),
            writes: otherWrites.filter(w => commonProps.includes(w))
          },
          reason: `Shares global state: ${commonProps.join(', ')}`
        });
      }
    }
  }

  // 4. Archivos con EVENTOS relacionados (más conexiones no obvias!)
  const eventPatterns = fileAnalysis.semanticAnalysis?.eventPatterns;
  if (eventPatterns) {
    const { eventEmitters = [], eventListeners = [] } = eventPatterns;
    const events = [...new Set([...eventEmitters, ...eventListeners])];

    // Buscar otros archivos con los mismos eventos
    for (const [otherFile, otherAnalysis] of Object.entries(staticResults.files || {})) {
      if (otherFile === filePath) continue;

      const otherEvents = otherAnalysis.semanticAnalysis?.eventPatterns || {};
      const otherEmits = otherEvents.eventEmitters || [];
      const otherListens = otherEvents.eventListeners || [];
      const otherEventNames = [...new Set([...otherEmits, ...otherListens])];

      const commonEvents = events.filter(e => otherEventNames.includes(e));
      if (commonEvents.length > 0) {
        context.relatedFiles.eventsConnectedTo.push({
          file: otherFile,
          sharedEvents: commonEvents,
          thisFileRole: {
            emits: eventEmitters.filter(e => commonEvents.includes(e)),
            listens: eventListeners.filter(e => commonEvents.includes(e))
          },
          otherFileRole: {
            emits: otherEmits.filter(e => commonEvents.includes(e)),
            listens: otherListens.filter(e => commonEvents.includes(e))
          },
          reason: `Connected via events: ${commonEvents.join(', ')}`
        });
      }
    }
  }

  // 5. Funciones exportadas (para que LLM sepa qué funciones son públicas)
  if (fileAnalysis.exports) {
    context.relatedFunctions = fileAnalysis.exports
      .filter(exp => exp.type === 'function')
      .map(exp => ({
        name: exp.name,
        type: exp.type,
        usedBy: fileAnalysis.usedBy || []
      }));
  }

  // 6. Contexto semántico adicional
  context.semanticContext = {
    hasSideEffects: fileAnalysis.semanticAnalysis?.sideEffects || {},
    riskScore: fileAnalysis.riskScore || {},
    complexity: {
      imports: (fileAnalysis.imports || []).length,
      exports: (fileAnalysis.exports || []).length,
      usedBy: (fileAnalysis.usedBy || []).length
    }
  };

  // 7. Metadata compacta de TODOS los archivos del proyecto
  // Solo para archivos huérfanos o complejos (para que la IA razone mejor)
  const isOrphan =
    (fileAnalysis.imports || []).length === 0 &&
    (fileAnalysis.usedBy || []).length === 0;

  if (isOrphan || context.relatedFiles.sharedStateWith.length === 0) {
    context.allProjectFiles = buildCompactProjectMetadata(staticResults, filePath);
  }

  return context;
}

/**
 * Construye metadata COMPACTA de todos los archivos del proyecto
 * Solo información clave, NO el código completo
 * @param {object} staticResults - Resultados del análisis estático
 * @param {string} excludeFile - Archivo a excluir
 * @returns {Array} - Metadata compacta
 */
export function buildCompactProjectMetadata(staticResults, excludeFile) {
  const compactMetadata = [];

  for (const [file, analysis] of Object.entries(staticResults?.files || {})) {
    if (file === excludeFile) continue;

    const semantic = analysis.semanticAnalysis || {};

    // Metadata compacta (5-10 líneas por archivo)
    const metadata = {
      path: file,

      // Exports (para entender el propósito del archivo)
      exports: (analysis.exports || [])
        .map(exp => exp.name)
        .slice(0, 5),

      // Shared state (CLAVE para conexiones)
      sharedState: {
        reads: semantic.sharedState?.reads || [],
        writes: semantic.sharedState?.writes || []
      },

      // Events (CLAVE para conexiones)
      events: {
        emits: semantic.eventPatterns?.eventEmitters || [],
        listens: semantic.eventPatterns?.eventListeners || []
      },

      // Side effects (para contexto)
      sideEffects: {
        hasGlobalAccess: semantic.sideEffects?.hasGlobalAccess || false,
        usesLocalStorage: semantic.sideEffects?.usesLocalStorage || false
      },

      // Nuevos tipos de conexiones
      connections: {
        cssInJS: analysis.cssInJSConnections?.length || 0,
        typeScript: analysis.typeScriptConnections?.length || 0,
        redux: analysis.reduxConnections?.length || 0
      }
    };

    // Solo incluir archivos que tengan información relevante
    const hasRelevantInfo =
      metadata.exports.length > 0 ||
      metadata.sharedState.reads.length > 0 ||
      metadata.sharedState.writes.length > 0 ||
      metadata.events.emits.length > 0 ||
      metadata.events.listens.length > 0 ||
      metadata.sideEffects.hasGlobalAccess ||
      metadata.sideEffects.usesLocalStorage ||
      metadata.connections.cssInJS > 0 ||
      metadata.connections.redux > 0;

    if (hasRelevantInfo) {
      compactMetadata.push(metadata);
    }
  }

  // Limitar a 30 archivos más relevantes
  return compactMetadata.slice(0, 30);
}

/**
 * Construye contexto del proyecto para el LLM
 * @param {object} staticResults - Resultados del análisis estático
 * @returns {object} - Contexto del proyecto
 */
export function buildProjectContext(staticResults) {
  const files = Object.keys(staticResults?.files || {});

  // Identificar archivos clave (más importados/exportados)
  const fileImportCount = {};
  for (const [filePath, analysis] of Object.entries(staticResults?.files || {})) {
    fileImportCount[filePath] = (analysis.usedBy || []).length;
  }

  const keyFiles = Object.entries(fileImportCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([file]) => file);

  // Estructura básica
  const structure = {
    totalFiles: files.length,
    filesByExtension: {},
    directories: new Set()
  };

  files.forEach(file => {
    const ext = file.split('.').pop();
    structure.filesByExtension[ext] = (structure.filesByExtension[ext] || 0) + 1;

    const dir = file.split('/').slice(0, -1).join('/');
    if (dir) structure.directories.add(dir);
  });

  structure.directories = Array.from(structure.directories).slice(0, 20);

  return {
    projectName: 'CogniSystem',
    totalFiles: files.length,
    keyFiles: keyFiles.slice(0, 5),
    structure: {
      filesByExtension: structure.filesByExtension,
      topDirectories: structure.directories.slice(0, 10)
    }
  };
}

/**
 * Construye contexto de subsistemas para el LLM
 * @param {string} filePath - Archivo actual
 * @param {object} projectContext - Contexto del proyecto
 * @returns {string} - Descripción legible de subsistemas
 */
function buildSubsystemContext(filePath, projectContext) {
  if (!projectContext?.projectStructure) {
    return 'No subsystem information available';
  }

  const structure = projectContext.projectStructure;
  const lines = [];

  // Encontrar a qué subsistema pertenece el archivo actual
  let currentSubsystem = null;
  for (const subsystem of structure.subsystems || []) {
    if (subsystem.files.includes(filePath)) {
      currentSubsystem = subsystem;
      break;
    }
  }

  if (currentSubsystem) {
    lines.push(`Current file belongs to subsystem: "${currentSubsystem.name}"`);
    lines.push(`  - Cohesion: ${currentSubsystem.cohesion.toFixed(2)} (internal connectivity)`);
    lines.push(`  - Files in subsystem: ${currentSubsystem.fileCount}`);
  } else {
    // Archivo no está en ningún subsistema (posible huérfano)
    const isOrphan = structure.orphans?.some(o => o.file === filePath);
    if (isOrphan) {
      lines.push('Current file is ORPHANED (not part of any subsystem)');
    } else {
      lines.push('Current file is not clustered in any subsystem');
    }
  }

  // Listar otros subsistemas
  if (structure.subsystems?.length > 0) {
    lines.push('\nOther subsystems in project:');
    structure.subsystems
      .filter(s => s !== currentSubsystem)
      .slice(0, 5)
      .forEach(sub => {
        lines.push(`  - "${sub.name}": ${sub.fileCount} files, cohesion ${sub.cohesion.toFixed(2)}`);
      });
  }

  return lines.join('\n');
}
