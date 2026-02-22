import { createLogger } from '../../../utils/logger.js';
import { calculateContentHash } from './hash-utils.js';
import { shouldUseLLM, decideFromAtoms } from './llm-decision.js';
import { getDecisionAuditLogger } from '../../../layer-c-memory/shadow-registry/audit-logger.js';

const logger = createLogger('OmnySys:llm:analysis:processor');

/**
 * Procesa un batch de archivos para determinar cuáles necesitan LLM
 * @param {Array} batch - Batch de entries del índice
 * @param {Object} context - Contexto con projectPath, OmnySysDataPath
 * @param {Object} deps - Dependencias inyectadas
 * @param {Object} llmAnalyzer - Instancia del analizador LLM
 * @param {Object} aiConfig - Configuración de AI
 * @returns {Object} Resultados del procesamiento
 */
export async function processFileBatch(batch, context, deps, llmAnalyzer, aiConfig) {
  const { projectPath, OmnySysDataPath } = context;
  const { getFileAnalysis, buildPromptMetadata, detectArchetypes, atomDecider } = deps;
  
  const filesNeedingLLM = [];
  let skippedUnchanged = 0;
  let skippedHasLLM = 0;
  
  const auditLogger = getDecisionAuditLogger(projectPath);
  await auditLogger.initialize();

  await Promise.all(batch.map(async ([filePath, fileInfo]) => {
    try {
      // Verificar si el archivo cambió desde el último análisis
      const fullPath = `${projectPath}/${filePath}`.replace(/\\/g, '/');
      const currentHash = await calculateContentHash(fullPath);
      const lastHash = fileInfo.hash;

      // Si el hash es igual y ya tiene LLM insights, skippear completamente
      if (currentHash && lastHash && currentHash === lastHash) {
        const fileAnalysis = await getFileAnalysis(projectPath, filePath);
        if (fileAnalysis?.llmInsights) {
          skippedUnchanged++;
          return;
        }
      }

      // Obtener análisis completo del archivo
      const fileAnalysis = await getFileAnalysis(projectPath, filePath);
      if (!fileAnalysis) return;

      // Verificar si ya fue procesado por LLM
      if (fileAnalysis.llmInsights) {
        skippedHasLLM++;
        return;
      }

      // Decisión primaria desde datos de átomos
      const atomDecision = decideFromAtoms(fileAnalysis, atomDecider);

      let needsLLM;
      let archetypes;

      if (atomDecision.decided) {
        needsLLM = atomDecision.needsLLM;
        archetypes = atomDecision.fileArchetype
          ? [{ type: atomDecision.fileArchetype, severity: 5, requiresLLM: needsLLM }]
          : [];
        if (atomDecision.fileArchetype) {
          logger.info(`   🧬 ${filePath}: Arquetipo derivado de átomos: ${atomDecision.fileArchetype} (${atomDecision.reason})`);
        }
      } else {
        // Fallback: Sistema de arquetipos de archivo
        const metadata = buildPromptMetadata(filePath, fileAnalysis);
        archetypes = detectArchetypes(metadata);

        if (archetypes.length > 0) {
          logger.info(`   🔍 ${filePath}: Arquetipos detectados: ${archetypes.map(a => a.type).join(', ')}`);
        }

        needsLLM = shouldUseLLM(archetypes, fileAnalysis, llmAnalyzer);
      }

      // Loguear decisión
      if (needsLLM) {
        logger.info(`   ✅ ${filePath}: Necesita LLM (${archetypes.map(a => a.type).join(', ')})`);

        await auditLogger.logLLMRequired(
          filePath,
          `Arquetipos detectados: ${archetypes.map(a => a.type).join(', ')}`,
          aiConfig?.model || 'unknown',
          { archetypes, source: atomDecision.decided ? 'atom-decider' : 'archetype-detector' }
        );

        for (const archetype of archetypes) {
          await auditLogger.logArchetypeDetection(
            filePath,
            archetype,
            archetype.detectedBy || 'rule',
            { confidence: archetype.confidence }
          );
        }

        filesNeedingLLM.push({
          filePath,
          archetypes: archetypes.map(a => a.type),
          priority: calculateLLMPriority(archetypes)
        });
      } else {
        await auditLogger.logLLMBypass(
          filePath,
          `Layer A analysis sufficient. Arquetipos: ${archetypes.map(a => a.type).join(', ')}`,
          archetypes.find(a => a.requiresLLM === false)?.ruleId || 'layer-a-sufficient',
          { archetypes, reason: 'Static analysis covers all connections' }
        );
      }
    } catch (error) {
      logger.warn(`   ⚠️ Error processing ${filePath}: ${error.message}`);
    }
  }));

  return { filesNeedingLLM, skippedUnchanged, skippedHasLLM };
}

/**
 * Calcula prioridad para análisis LLM
 * @param {Array} archetypes - Arquetipos detectados
 * @returns {string} Prioridad (critical, high, medium, low)
 */
export function calculateLLMPriority(archetypes) {
  // Prioridad CRITICAL: God objects, archivos críticos
  if (archetypes.some(a => a.type === 'god-object')) return 'critical';

  // Prioridad HIGH: Orphan modules, state managers (conexiones ocultas)
  if (archetypes.some(a => ['orphan-module', 'state-manager', 'event-hub'].includes(a.type))) {
    return 'high';
  }

  // Prioridad MEDIUM: Dynamic imports, singletons
  if (archetypes.some(a => ['dynamic-importer', 'singleton'].includes(a.type))) {
    return 'medium';
  }

  // Prioridad LOW: Otros casos
  return 'low';
}
