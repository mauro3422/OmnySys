/**
 * core.js
 * Función principal de enriquecimiento semántico
 * Orquesta análisis estático + LLM opcional
 */

import { createLLMAnalyzer } from '../llm-analyzer.js';
import { loadAIConfig } from '../../ai/llm-client.js';
import { detectSemanticIssues } from '../semantic-issues-detector.js';
import { detectAllSemanticConnections } from '../static-extractors.js';
import { detectAllAdvancedConnections } from '../advanced-extractors.js';
import { extractAllMetadata } from '../metadata-extractors.js';

import { mergeAnalyses } from './mergers.js';
import { buildFileSpecificContext, buildProjectContext } from './context-builders.js';
import { limitContextSize } from './utils.js';

/**
 * Enriquece análisis semántico con LLM opcional
 *
 * Pipeline:
 * 1. Análisis estático (siempre) - pattern matching + AST
 * 2. Identificar casos de baja confianza o complejos
 * 3. Aplicar LLM solo a casos que lo necesiten
 * 4. Merge resultados priorizando alta confianza
 * 5. Retornar enhanced connections
 *
 * @param {object} staticResults - Resultados del análisis estático
 * @param {object} fileSourceCode - Mapa de filePath -> código fuente
 * @param {object} aiConfig - Configuración de AI (opcional, se carga si no se pasa)
 * @param {object} projectContext - Contexto del proyecto para el LLM
 * @param {object} options - Opciones adicionales
 *   - iterative: boolean - Ejecutar múltiples pasadas hasta consolidar (default: false)
 *   - maxIterations: number - Máximo de iteraciones (default: 3)
 * @returns {Promise<object>} - Enhanced semantic connections
 */
export async function enrichSemanticAnalysis(staticResults, fileSourceCode, aiConfig = null, projectContext = null, options = {}) {
  const { iterative = false, maxIterations = Infinity } = options;
  
  // Cargar config si no se pasó
  if (!aiConfig) {
    aiConfig = await loadAIConfig();
  }

  // Si LLM está deshabilitado, retornar solo resultados estáticos
  if (!aiConfig.llm.enabled) {
    return {
      enhanced: false,
      reason: 'LLM disabled in config',
      results: staticResults
    };
  }

  // Inicializar LLM analyzer
  const llmAnalyzer = await createLLMAnalyzer();
  const initialized = await llmAnalyzer.initialize();

  if (!initialized) {
    console.warn('⚠️  LLM servers not available, using static analysis only');
    return {
      enhanced: false,
      reason: 'LLM servers not available',
      results: staticResults
    };
  }

  console.log('  🤖 LLM enrichment enabled, analyzing files...');

  // ============================================================
  // PASO 0: Extracción estática de conexiones (regex/patterns)
  // Esto detecta conexiones OBVIAS sin necesidad de LLM
  // ============================================================
  console.log('  🔍 Running static extraction for localStorage/events...');
  const staticConnections = detectAllSemanticConnections(fileSourceCode);
  
  console.log(`  ✓ Basic static extraction found:`);
  console.log(`    - ${staticConnections.localStorageConnections.length} localStorage connections`);
  console.log(`    - ${staticConnections.eventConnections.length} event connections`);
  console.log(`    - ${staticConnections.globalConnections?.length || 0} global variable connections`);

  // ============================================================
  // PASO 0b: Extracción AVANZADA (Workers, BroadcastChannel, WebSocket, etc)
  // ============================================================
  console.log('  🔍 Running advanced pattern extraction...');
  const advancedConnections = detectAllAdvancedConnections(fileSourceCode);
  
  console.log(`  ✓ Advanced extraction found:`);
  console.log(`    - ${advancedConnections.byType.broadcastChannel.length} BroadcastChannel connections`);
  console.log(`    - ${advancedConnections.byType.webSocket.length} WebSocket connections`);
  console.log(`    - ${advancedConnections.byType.network.length} shared API endpoints`);
  console.log(`    - ${advancedConnections.byType.worker.length} WebWorker connections`);
  console.log(`    - ${advancedConnections.connections.length} total advanced connections`);
  
  // Agregar conexiones estáticas a los resultados
  if (staticConnections.all.length > 0 || advancedConnections.connections.length > 0) {
    staticResults.connections = {
      ...(staticResults.connections || {}),
      localStorage: staticConnections.localStorageConnections,
      events: staticConnections.eventConnections,
      globals: staticConnections.globalConnections || [],
      advanced: advancedConnections.connections,
      total: staticConnections.all.length + advancedConnections.connections.length,
      staticDetected: true
    };
    
    // Combinar todas las conexiones para procesar
    const allStaticConnections = [...staticConnections.all, ...advancedConnections.connections];
    
    // Agregar conexiones semánticas a cada archivo
    for (const conn of allStaticConnections) {
      // Agregar al archivo source
      if (staticResults.files[conn.sourceFile]) {
        staticResults.files[conn.sourceFile].semanticConnections = [
          ...(staticResults.files[conn.sourceFile].semanticConnections || []),
          {
            target: conn.targetFile,
            type: conn.via,
            key: conn.key || conn.event,
            confidence: conn.confidence,
            detectedBy: 'static-extractor'
          }
        ];
      }
      // Agregar al archivo target
      if (staticResults.files[conn.targetFile]) {
        staticResults.files[conn.targetFile].semanticConnections = [
          ...(staticResults.files[conn.targetFile].semanticConnections || []),
          {
            target: conn.sourceFile,
            type: conn.via,
            key: conn.key || conn.event,
            confidence: conn.confidence,
            detectedBy: 'static-extractor'
          }
        ];
      }
    }
  }

  // ============================================================
  // PASO 0c: Extracción de METADATOS adicionales (JSDoc, runtime, async, errors, build)
  // ============================================================
  console.log('  🔍 Extracting additional metadata...');
  const fileMetadata = {};
  for (const [filePath, code] of Object.entries(fileSourceCode)) {
    fileMetadata[filePath] = extractAllMetadata(filePath, code);
  }
  
  // Agregar metadatos a los resultados
  for (const [filePath, metadata] of Object.entries(fileMetadata)) {
    if (staticResults.files[filePath]) {
      staticResults.files[filePath].metadata = {
        ...(staticResults.files[filePath].metadata || {}),
        jsdocContracts: metadata.jsdoc,
        runtimeContracts: metadata.runtime,
        asyncPatterns: metadata.async,
        errorHandling: metadata.errors,
        buildTimeDeps: metadata.build
      };
    }
  }
  
  // Log resumen de metadatos
  const totalJSDoc = Object.values(fileMetadata).reduce((sum, m) => sum + (m.jsdoc?.all?.length || 0), 0);
  const totalAsync = Object.values(fileMetadata).reduce((sum, m) => sum + (m.async?.all?.length || 0), 0);
  const totalErrors = Object.values(fileMetadata).reduce((sum, m) => sum + (m.errors?.all?.length || 0), 0);
  const totalEnvVars = Object.values(fileMetadata).reduce((sum, m) => sum + (m.build?.envVars?.length || 0), 0);
  
  console.log(`  ✓ Metadata extracted:`);
  console.log(`    - ${totalJSDoc} JSDoc contracts`);
  console.log(`    - ${totalAsync} async patterns`);
  console.log(`    - ${totalErrors} error handling patterns`);
  console.log(`    - ${totalEnvVars} environment variables`);

  // Construir contexto global del proyecto (estructura general)
  const globalContext = projectContext || buildProjectContext(staticResults);

  // =============================================================================
  // REGLA CRITICA DE ORO: SOLO PASAR CONTEXTO RELEVANTE AL LLM
  // =============================================================================
  // El LLM TIENE CONTEXTO LIMITADO. Cada token irrelevante es capacidad perdida.
  // NUNCA pasar todo el proyecto al LLM. Solo archivos con INDICIOS de conexión.
  //
  // Contexto que se pasa por archivo (OPCION B - por archivo completo):
  //   - Archivos con shared state común (detectado por capa A)
  //   - Archivos con eventos comunes (detectado por capa A)
  //   - TODOS los imports directos (con metadatos: exports, localStorage, eventos)
  //   - Metadatos del archivo SOLO si tienen contenido (no vacíos)
  //
  // FUTURO (OPCION C - por funcion):
  //   Cuando el sistema esté maduro, analizar funcion por funcion en lugar de
  //   archivo completo. Cada funcion vería solo:
  //   - Imports que usa esa funcion específica
  //   - Variables globales que toca
  //   - Eventos que emite/escucha
  //   Esto permitiria granularidad fina y evitaría ruido de funciones no usadas.
  //
  // Si un archivo no tiene sospechosos, el LLM recibe "No obvious suspects".
  // Esto fuerza al LLM a concentrarse en VALIDAR conexiones detectadas,
  // no a descubrir entre ruido.
  // =============================================================================

  // Identificar archivos que necesitan análisis LLM
  const filesToAnalyze = [];
  for (const [filePath, analysis] of Object.entries(staticResults.files || {})) {
    // Si llmOnlyForComplex está desactivado, analizar TODOS los archivos
    const shouldAnalyze = !aiConfig.analysis.llmOnlyForComplex ||
                          llmAnalyzer.needsLLMAnalysis(analysis.semanticAnalysis || {}, analysis);

    if (shouldAnalyze) {
      // Contexto REDUCIDO y ESPECÍFICO (solo archivos sospechosos, no todo el proyecto)
      const fileContext = buildFileSpecificContext(
        filePath, 
        staticResults, 
        globalContext,
        fileMetadata[filePath]
      );

      // Limitar contexto para evitar alucinaciones
      const limitedContext = limitContextSize(fileContext);

      // Combinar contexto global + específico del archivo (LIMITADO)
      const combinedContext = {
        ...globalContext,
        fileSpecific: limitedContext
      };

      filesToAnalyze.push({
        filePath,
        code: fileSourceCode[filePath],
        staticAnalysis: analysis.semanticAnalysis,
        metadata: fileMetadata[filePath],
        projectContext: combinedContext
      });
    }
  }

  if (aiConfig.analysis.analyzePercentage < 1.0) {
    // Si hay límite de porcentaje, solo analizar un subset
    const limit = Math.ceil(filesToAnalyze.length * aiConfig.analysis.analyzePercentage);
    filesToAnalyze.splice(limit);
    console.log(`  ⚙️  Limited to ${aiConfig.analysis.analyzePercentage * 100}% of files`);
  }

  if (filesToAnalyze.length === 0) {
    console.log('  ✓ No files need LLM analysis (static analysis sufficient)');
    return {
      enhanced: false,
      reason: 'No complex cases found',
      results: staticResults
    };
  }

  console.log(`  📊 Analyzing ${filesToAnalyze.length} complex files with LLM...`);

  // Analizar en paralelo
  const llmResults = await llmAnalyzer.analyzeMultiple(filesToAnalyze);

  // Merge resultados
  let enhancedCount = 0;
  // Deep copy to avoid mutation issues
  const enhancedResults = {
    ...staticResults,
    files: { ...staticResults.files }
  };

  for (let i = 0; i < filesToAnalyze.length; i++) {
    const { filePath } = filesToAnalyze[i];
    const llmResult = llmResults[i];

    // Validar que el resultado tiene la estructura mínima requerida
    if (llmResult && llmResult.confidence !== undefined && llmResult.sharedState !== undefined) {
      enhancedResults.files[filePath] = mergeAnalyses(
        enhancedResults.files[filePath],
        llmResult
      );
      enhancedCount++;
    }
  }

  console.log(`  ✓ Enhanced ${enhancedCount}/${filesToAnalyze.length} files with LLM insights`);

  // ✅ NUEVO: Modo iterativo
  let iteration = 1;
  // Deep copy for iterative refinement
  let iterativeResults = {
    ...enhancedResults,
    files: { ...enhancedResults.files }
  };

  if (iterative && enhancedCount > 0) {
    const SAFETY_LIMIT = 100; // Evitar loops infinitos
    const effectiveMax = Math.min(maxIterations, SAFETY_LIMIT);

    console.log(`\n  🔄 Starting iterative consolidation (until convergence)...`);

    while (iteration < effectiveMax) {
      console.log(`\n  🔄 Iteration ${iteration + 1}`);

      // Buscar archivos que todavía necesitan más análisis
      const needsMoreAnalysis = [];
      for (const [filePath, analysis] of Object.entries(iterativeResults.files || {})) {
        // Si tiene suggestedConnections de alta confianza pero no están aplicadas aún
        const llmInsights = analysis.llmInsights;
        if (llmInsights?.suggestedConnections?.length > 0) {
          const highConfidenceConnections = llmInsights.suggestedConnections
            .filter(conn => conn.confidence > 0.9);

          if (highConfidenceConnections.length > 0) {
            needsMoreAnalysis.push({
              filePath,
              code: fileSourceCode[filePath],
              staticAnalysis: analysis.semanticAnalysis,
              projectContext: {
                ...globalContext,
                fileSpecific: buildFileSpecificContext(filePath, iterativeResults, globalContext)
              }
            });
          }
        }
      }

      if (needsMoreAnalysis.length === 0) {
        console.log(`  ✓ No more files need analysis - consolidation complete`);
        break;
      }

      console.log(`  📊 ${needsMoreAnalysis.length} files need more analysis`);

      // Re-analizar archivos
      const iterationResults = await llmAnalyzer.analyzeMultiple(needsMoreAnalysis);

      // Aplicar resultados
      let improvedCount = 0;
      for (let i = 0; i < needsMoreAnalysis.length; i++) {
        const { filePath } = needsMoreAnalysis[i];
        const iterationResult = iterationResults[i];

        // Validar estructura completa antes de merge
        if (iterationResult && iterationResult.confidence !== undefined &&
            iterationResult.sharedState !== undefined && iterationResult.confidence > 0.85) {
          iterativeResults.files[filePath] = mergeAnalyses(
            iterativeResults.files[filePath],
            iterationResult
          );
          improvedCount++;
        }
      }

      console.log(`  ✓ Improved ${improvedCount} files in this iteration`);

      if (improvedCount === 0) {
        console.log(`  ✓ No improvements - stopping iteration`);
        break;
      }

      iteration++;
    }

    if (iteration >= effectiveMax) {
      console.log(`  ⚠️  Reached safety limit (${effectiveMax} iterations)`);
      console.log(`  💡 System may need more iterations to fully converge`);
    }
  }

  // Detectar issues semánticos (sobre el resultado final)
  console.log('  🔍 Detecting semantic issues...');
  const issuesReport = detectSemanticIssues(iterativeResults);

  return {
    enhanced: true,
    enhancedCount,
    totalAnalyzed: filesToAnalyze.length,
    results: iterativeResults,
    issues: issuesReport,
    iterations: iteration
  };
}
