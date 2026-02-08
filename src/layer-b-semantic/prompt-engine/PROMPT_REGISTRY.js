/**
 * Prompt Registry - Sistema Plug & Play para Arquetipos
 * 
 * Para agregar un nuevo tipo de análisis, solo necesitas:
 * 1. Crear el detector de metadatos (función)
 * 2. Crear el template de prompt (archivo)
 * 3. Registrarlo aquí
 * 
 * El sistema automáticamente:
 * - Detecta el tipo por metadatos
 * - Selecciona el prompt correcto
 * - Merges el resultado en llmInsights
 */

// Importar templates
import godObjectTemplate from './prompt-templates/god-object.js';
import circularDependencyTemplate from './prompt-templates/circular-dependency.js';
import semanticConnectionsTemplate from './prompt-templates/semantic-connections.js';
import dynamicImportsTemplate from './prompt-templates/dynamic-imports.js';
import singletonTemplate from './prompt-templates/singleton.js';
import orphanModuleTemplate from './prompt-templates/orphan-module.js';
import globalStateTemplate from './prompt-templates/global-state.js';
import defaultTemplate from './prompt-templates/default.js';
import criticalBottleneckTemplate from './prompt-templates/critical-bottleneck.js';
import apiEventBridgeTemplate from './prompt-templates/api-event-bridge.js';
import storageSyncTemplate from './prompt-templates/storage-sync.js';
import { validateRegistry } from './registry-validator.js';

// Importar detectores compartidos
import { detectGodObject, detectOrphanModule } from '../metadata-contract/index.js';

/**
 * REGISTRO DE ARQUETIPOS
 *
 * ============================================================
 * REGLAS DEL SISTEMA (LEER ANTES DE MODIFICAR):
 *
 * 1. Un arquetipo DEBE detectar un PATRON DE CONEXION entre archivos.
 *    Pregunta obligatoria: "Esto me dice algo sobre como este archivo
 *    se CONECTA con otros archivos?" Si la respuesta es no, NO es un arquetipo.
 *
 * 2. Si la metadata sola puede determinar el patron Y la accion,
 *    NO enviar a LLM. El LLM es para conexiones INVISIBLES que la
 *    metadata no puede resolver (eventos, estado compartido, imports dinamicos).
 *
 * 3. Anti-patrones (cosas que NO son arquetipos):
 *    - "usa CSS-in-JS" -> estilo de codigo, no conexion
 *    - "tiene TypeScript" -> lenguaje, no conexion
 *    - "tiene errores" -> calidad, no conexion
 *    - "dependencia circular" -> ya lo detecta el grafo en Layer A
 *
 * 4. Ver docs/ARCHETYPE_DEVELOPMENT_GUIDE.md para el checklist completo.
 * ============================================================
 *
 * Cada entrada define:
 * - type: Identificador unico (kebab-case)
 * - severity: Prioridad arquitectonica (0-10, mayor = mas prioritario)
 * - detector: Funcion que recibe metadata y retorna boolean
 * - template: Prompt template (systemPrompt, userPrompt)
 * - mergeKey: Clave en llmInsights donde se guardara el resultado
 * - fields: Campos esperados en la respuesta del LLM
 */
export const ARCHETYPE_REGISTRY = [
  {
    type: 'god-object',
    severity: 10,
    requiresLLM: true, // Siempre: responsabilidades y riesgo son invisibles para metadata
    detector: (metadata) => {
      // Considerar tanto dependents estáticos como semánticos
      const totalDependents = (metadata.dependentCount || 0) + (metadata.semanticDependentCount || 0);
      return detectGodObject(metadata.exportCount, totalDependents);
    },
    template: godObjectTemplate,
    mergeKey: 'godObjectAnalysis',
    fields: ['riskLevel', 'responsibilities', 'impactScore']
  },
  {
    type: 'orphan-module',
    severity: 5,
    requiresLLM: true, // El LLM sugiere potentialUsage — conexiones posibles invisibles para metadata
    detector: (metadata) => {
      // Solo es orphan si NO tiene dependents estaticos NI semanticos
      const totalDependents = (metadata.dependentCount || 0) + (metadata.semanticDependentCount || 0);
      return detectOrphanModule(metadata.exportCount, totalDependents);
    },
    template: orphanModuleTemplate,
    mergeKey: 'orphanAnalysis',
    fields: ['isOrphan', 'potentialUsage', 'suggestedUsage']
  },
  {
    type: 'dynamic-importer',
    severity: 7,
    requiresLLM: true, // Siempre: rutas dinámicas son irresolubles estáticamente
    detector: (metadata) => metadata.hasDynamicImports === true,
    template: dynamicImportsTemplate,
    mergeKey: 'dynamicImportAnalysis',
    fields: ['dynamicImports', 'routeMapAnalysis']
  },
  {
    type: 'singleton',
    severity: 7,
    requiresLLM: 'conditional', // Solo si hay state compartido no resuelto por Layer A
    detector: (metadata) => {
      // Detectar patrón Singleton
      return metadata.hasSingletonPattern === true ||
             (metadata.functionCount === 1 &&
              metadata.exportCount === 1 &&
              metadata.dependentCount > 5);
    },
    template: singletonTemplate,
    mergeKey: 'singletonAnalysis',
    fields: ['instanceCount', 'globalState', 'threadSafety', 'initializationPattern']
  },
  {
    type: 'event-hub',
    severity: 6,
    requiresLLM: 'conditional', // Solo si hay eventos no resueltos por cross-reference estático
    detector: (metadata) => metadata.hasEventEmitters || metadata.hasEventListeners || (metadata.eventNames?.length || 0) > 0,
    template: semanticConnectionsTemplate,
    mergeKey: 'eventHubAnalysis',
    fields: ['eventNames', 'eventConnections']
  },
  {
    type: 'global-state',
    severity: 6,
    requiresLLM: 'conditional', // Solo si hay globals no resueltos por cross-reference estático
    detector: (metadata) => metadata.usesGlobalState === true && (metadata.localStorageKeys?.length || 0) === 0,
    template: globalStateTemplate,
    mergeKey: 'globalStateAnalysis',
    fields: ['globalVariables', 'accessPatterns', 'riskLevel']
  },
  {
    type: 'state-manager',
    severity: 6,
    requiresLLM: 'conditional', // Solo si hay state no resuelto por cross-reference estático
    detector: (metadata) =>
      metadata.definesGlobalState === true ||
      metadata.hasLocalStorage === true ||
      (metadata.localStorageKeys?.length || 0) > 0 ||
      metadata.hasGlobalAccess,
    template: semanticConnectionsTemplate,
    mergeKey: 'stateManagerAnalysis',
    fields: ['localStorageKeys', 'sharedState']
  },
  {
    type: 'facade',
    severity: 4,
    requiresLLM: false, // 100% determinístico: reExportCount viene del AST
    detector: (metadata) => {
      // Re-exporta mucho pero define poco propio
      const hasReExports = (metadata.reExportCount || 0) >= 3;
      const isMainlyReExporter = (metadata.exportCount || 0) > 0 &&
                                  (metadata.functionCount || 0) <= 1;
      const isIndexFile = (metadata.filePath || '').endsWith('index.js') ||
                          (metadata.filePath || '').endsWith('index.ts');
      return hasReExports || (isIndexFile && isMainlyReExporter && (metadata.exportCount || 0) >= 3);
    },
    template: null, // No usa LLM
    mergeKey: 'facadeAnalysis',
    fields: ['reExportedModules', 'aggregationScope', 'blastRadius']
  },
  {
    type: 'config-hub',
    severity: 5,
    requiresLLM: false, // 100% determinístico: exportCount + dependentCount del grafo
    detector: (metadata) => {
      const exportsMany = (metadata.exportCount || 0) >= 5;
      const hasManyDependents = (metadata.dependentCount || 0) + (metadata.semanticDependentCount || 0) >= 5;
      const fewFunctions = (metadata.functionCount || 0) <= 2;
      // Muchos exports, muchos dependents, pocas funciones = probablemente config
      return exportsMany && hasManyDependents && fewFunctions;
    },
    template: null, // No usa LLM
    mergeKey: 'configHubAnalysis',
    fields: ['configKeys', 'consumers', 'riskLevel']
  },
  {
    type: 'entry-point',
    severity: 3,
    requiresLLM: false, // 100% determinístico: importCount + dependentCount del grafo
    detector: (metadata) => {
      const importsMuch = (metadata.importCount || 0) >= 5;
      const nobodyImportsIt = (metadata.dependentCount || 0) + (metadata.semanticDependentCount || 0) === 0;
      // Importa mucho pero nadie lo importa = entry point
      return importsMuch && nobodyImportsIt;
    },
    template: null, // No usa LLM
    mergeKey: 'entryPointAnalysis',
    fields: ['bootSequence', 'servicesInitialized']
  },
  {
    type: 'network-hub',
    severity: 5,
    requiresLLM: 'conditional', // Bypass si todos los endpoints ya están cross-referenciados
    detector: (metadata) => (
      metadata.hasNetworkCalls === true &&
      (metadata.networkEndpoints?.length || 0) > 0
    ),
    template: semanticConnectionsTemplate, // Reutilizar template de semantic connections
    mergeKey: 'networkHubAnalysis',
    fields: ['endpoints', 'apiDependencies', 'riskLevel']
  },
  {
    type: 'critical-bottleneck',
    severity: 10,
    requiresLLM: true, // Siempre: necesita sugerir optimizaciones específicas
    detector: (metadata) => {
      const isHotspot = (metadata.gitHotspotScore || 0) > 3;
      const isComplex = ['O(n²)', 'O(n³)'].includes(metadata.estimatedComplexity);
      const totalDependents = (metadata.dependentCount || 0) + (metadata.semanticDependentCount || 0);
      const isWidelyUsed = totalDependents > 5;
      const hasManyCalls = (metadata.externalCallCount || 0) > 3;

      return isHotspot && isComplex && isWidelyUsed && hasManyCalls;
    },
    template: criticalBottleneckTemplate,
    mergeKey: 'criticalBottleneckAnalysis',
    fields: ['optimizationStrategy', 'estimatedImpact', 'refactoringRisk']
  },
  {
    type: 'api-event-bridge',
    severity: 8,
    requiresLLM: true, // Siempre: necesita analizar flujo de eventos
    detector: (metadata) => {
      const hasNetwork = metadata.hasNetworkCalls === true;
      const hasEvents = metadata.hasEventEmitters === true;
      const hasMultipleEndpoints = (metadata.networkEndpoints?.length || 0) > 1;

      return hasNetwork && hasEvents && hasMultipleEndpoints;
    },
    template: apiEventBridgeTemplate,
    mergeKey: 'apiEventBridgeAnalysis',
    fields: ['apiFlowDiagram', 'eventSequence', 'riskOfRaceConditions']
  },
  {
    type: 'storage-sync-manager',
    severity: 8,
    requiresLLM: 'conditional', // Solo si la lógica de sync es compleja
    detector: (metadata) => {
      const hasStorage = metadata.hasLocalStorage === true;
      const hasListeners = metadata.hasEventListeners === true;
      const hasStorageEvent = (metadata.eventNames || []).includes('storage');
      const hasConnections = (metadata.semanticConnections?.length || 0) > 2;

      return hasStorage && hasListeners && hasStorageEvent && hasConnections;
    },
    template: storageSyncTemplate,
    mergeKey: 'storageSyncAnalysis',
    fields: ['syncPatterns', 'conflictResolution', 'consistencyGuarantees']
  },
  {
    type: 'default',
    severity: 0,
    requiresLLM: true, // Fallback: archivos sin arquetipo pasan por análisis general
    detector: () => true, // Siempre coincide (fallback)
    template: defaultTemplate,
    mergeKey: 'generalAnalysis',
    fields: ['patterns', 'functions', 'exports']
  }
];

/**
 * Obtiene el arquetipo por tipo
 * @param {string} type - Tipo de arquetipo
 * @returns {Object|undefined} - Arquetipo o undefined
 */
export function getArchetype(type) {
  return ARCHETYPE_REGISTRY.find(a => a.type === type);
}

/**
 * Detecta TODOS los arquetipos que coinciden con los metadatos
 * @param {Object} metadata - Metadatos del archivo
 * @returns {Array} - Array de {type, severity}
 */
export function detectArchetypes(metadata) {
  return ARCHETYPE_REGISTRY
    .filter(a => a.type !== 'default') // Excluir default de detección múltiple
    .filter(a => {
      try {
        return !!a.detector(metadata);
      } catch (error) {
        console.warn(`⚠️  Archetype detector failed (${a.type}): ${error.message}`);
        return false;
      }
    })
    .map(a => ({ type: a.type, severity: Number.isFinite(a.severity) ? a.severity : 0 }));
}

/**
 * Selecciona el arquetipo con mayor severidad
 * @param {Array} archetypes - Array de arquetipos detectados
 * @returns {string} - Tipo de arquetipo seleccionado
 */
export function selectArchetypeBySeverity(archetypes) {
  if (archetypes.length === 0) return 'default';
  return archetypes.sort((a, b) => b.severity - a.severity)[0].type;
}

/**
 * Obtiene el template para un tipo
 * @param {string} type - Tipo de análisis
 * @returns {Object} - Template de prompt
 */
export function getTemplateForType(type) {
  const archetype = getArchetype(type);
  return archetype?.template || defaultTemplate;
}

/**
 * Obtiene la configuración de merge para un tipo
 * @param {string} type - Tipo de análisis
 * @returns {Object|null} - Configuración de merge
 */
export function getMergeConfig(type) {
  const archetype = getArchetype(type);
  if (!archetype) return null;
  
  return {
    mergeKey: archetype.mergeKey,
    fields: archetype.fields,
    isDetectedByMetadata: archetype.detector
  };
}

/**
 * Lista todos los arquetipos disponibles
 * @returns {Array} - Array de objetos con type, severity, mergeKey, fields
 */
export function listAvailableArchetypes() {
  return ARCHETYPE_REGISTRY.map(a => ({
    type: a.type,
    severity: a.severity,
    mergeKey: a.mergeKey,
    fields: a.fields
  }));
}

/**
 * Filtra arquetipos que requieren LLM
 * @param {Array} archetypes - Array de {type, severity}
 * @returns {Array} - Solo los que tienen requiresLLM: true o 'conditional'
 */
export function filterArchetypesRequiringLLM(archetypes) {
  return archetypes.filter(a => {
    const archetype = getArchetype(a.type);
    return archetype?.requiresLLM === true || archetype?.requiresLLM === 'conditional';
  });
}

/**
 * Verifica si un tipo de arquetipo necesita LLM
 * @param {string} type - Tipo de arquetipo
 * @returns {boolean|string} - true, false, o 'conditional'
 */
export function archetypeRequiresLLM(type) {
  const archetype = getArchetype(type);
  return archetype?.requiresLLM ?? true;
}

export default {
  ARCHETYPE_REGISTRY,
  getArchetype,
  detectArchetypes,
  selectArchetypeBySeverity,
  getTemplateForType,
  getMergeConfig,
  listAvailableArchetypes,
  filterArchetypesRequiringLLM,
  archetypeRequiresLLM
};

const registryValidation = validateRegistry(ARCHETYPE_REGISTRY);
if (!registryValidation.valid) {
  console.warn('⚠️  ARCHETYPE_REGISTRY validation issues:');
  for (const issue of registryValidation.issues) {
    console.warn(`  - ${issue}`);
  }
}
