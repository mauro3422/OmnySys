/**
 * utils.js
 * Utilidades para el enriquecimiento semántico
 */

/**
 * Limita el tamaño del contexto para evitar alucinaciones del LLM
 * CLAVE: Menos contexto = más preciso, menos alucinaciones
 * @param {object} context - Contexto completo
 * @returns {object} - Contexto limitado
 */
export function limitContextSize(context) {
  // =============================================================================
  // REGLA CRITICA DE ORO: LIMITAR CONTEXTO PARA EL LLM (PERO NO LOS IMPORTS)
  // =============================================================================
  // El LLM tiene LIMITE de tokens, pero los imports directos son SAGRADOS.
  // Un archivo con 20 imports debe mostrar los 20 (con metadatos compactos).
  //
  // Esta funcion trunca:
  //   - usedBy: max 3 (quienes usan este archivo - menos critico)
  //   - allProjectFiles: max 5 (solo si es huérfano)
  //   - relatedFunctions: max 5 (funciones exportadas)
  //
  // NO se truncan:
  //   - imports: TODOS (con metadatos compactos)
  //   - sharedStateWith: TODOS (ya filtrados por capa A)
  //   - eventsConnectedTo: TODOS (ya filtrados por capa A)
  //
  // FUTURO (Opcion C): Analisis por funcion podria filtrar imports por funcion.
  // =============================================================================
  if (!context) return null;

  return {
    currentFile: context.currentFile,
    relatedFiles: {
      // TODOS los imports (con metadatos compactos) - NO truncar
      // Los imports son criticos para entender el grafo de dependencias
      imports: context.relatedFiles?.imports || [],

      // Solo los 3 archivos que más lo usan (menos critico)
      usedBy: (context.relatedFiles?.usedBy || []).slice(0, 3),

      // TODOS los shared state (estos son los más importantes)
      sharedStateWith: context.relatedFiles?.sharedStateWith || [],

      // TODOS los eventos (también muy importantes)
      eventsConnectedTo: context.relatedFiles?.eventsConnectedTo || []
    },

    // Solo las 5 funciones más usadas
    relatedFunctions: (context.relatedFunctions || [])
      .sort((a, b) => (b.usedBy?.length || 0) - (a.usedBy?.length || 0))
      .slice(0, 5),

    // Contexto semántico completo (es pequeño)
    semanticContext: context.semanticContext,

    // Metadata adicional
    metadata: context.metadata,
    connections: context.connections,
    allProjectFiles: context.allProjectFiles?.slice(0, 10) // Limitar a 10
  };
}

/**
 * Extrae estadísticas de enriquecimiento
 * @param {object} enrichmentResult - Resultado de enrichSemanticAnalysis
 * @returns {object} - Estadísticas
 */
export function getEnrichmentStats(enrichmentResult) {
  if (!enrichmentResult?.enhanced) {
    return {
      enhanced: false,
      reason: enrichmentResult?.reason || 'Unknown'
    };
  }

  const { results } = enrichmentResult;
  let totalLLMConnections = 0;
  let filesWithLLMInsights = 0;

  for (const file of Object.values(results?.files || {})) {
    if (file.llmInsights) {
      filesWithLLMInsights++;
      totalLLMConnections += (file.llmInsights.enhancedConnections || []).length;
    }
  }

  return {
    enhanced: true,
    filesAnalyzed: enrichmentResult.totalAnalyzed,
    filesEnhanced: enrichmentResult.enhancedCount,
    filesWithLLMInsights,
    totalLLMConnections
  };
}
