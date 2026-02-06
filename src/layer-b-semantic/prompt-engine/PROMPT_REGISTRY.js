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
import semanticConnectionsTemplate from './prompt-templates/semantic-connections.js';
import dynamicImportsTemplate from './prompt-templates/dynamic-imports.js';
import singletonTemplate from './prompt-templates/singleton.js';
import orphanModuleTemplate from './prompt-templates/orphan-module.js';
import globalStateTemplate from './prompt-templates/global-state.js';
import defaultTemplate from './prompt-templates/default.js';
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
    // TODO: Este arquetipo se puede determinar 100% con metadata (exportCount > 0 && dependentCount === 0).
    // Evaluar agregar requiresLLM: false para no gastar tokens de LLM en algo que la metadata ya sabe.
    // El LLM actualmente solo sugiere potentialUsage/suggestedUsage, que no son datos de conexion.
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
    detector: (metadata) => metadata.hasDynamicImports === true,
    template: dynamicImportsTemplate,
    mergeKey: 'dynamicImportAnalysis',
    fields: ['dynamicImports', 'routeMapAnalysis']
  },
  {
    type: 'singleton',
    severity: 7,
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
    detector: (metadata) => metadata.hasEventEmitters || metadata.hasEventListeners || (metadata.eventNames?.length || 0) > 0,
    template: semanticConnectionsTemplate,
    mergeKey: 'eventHubAnalysis',
    fields: ['eventNames', 'eventConnections']
  },
  {
    type: 'global-state',
    severity: 6,
    detector: (metadata) => metadata.usesGlobalState === true && (metadata.localStorageKeys?.length || 0) === 0,
    template: globalStateTemplate,
    mergeKey: 'globalStateAnalysis',
    fields: ['globalVariables', 'accessPatterns', 'riskLevel']
  },
  {
    type: 'state-manager',
    severity: 6,
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
    detector: (metadata) => {
      // Re-exporta mucho pero define poco propio
      const hasReExports = (metadata.reExportCount || 0) >= 3;
      const isMainlyReExporter = (metadata.exportCount || 0) > 0 &&
                                  (metadata.functionCount || 0) <= 1;
      const isIndexFile = (metadata.filePath || '').endsWith('index.js') ||
                          (metadata.filePath || '').endsWith('index.ts');
      return hasReExports || (isIndexFile && isMainlyReExporter && (metadata.exportCount || 0) >= 3);
    },
    template: defaultTemplate, // Severity bajo, usa template default
    mergeKey: 'facadeAnalysis',
    fields: ['reExportedModules', 'aggregationScope', 'blastRadius']
  },
  {
    type: 'config-hub',
    severity: 5,
    detector: (metadata) => {
      const exportsMany = (metadata.exportCount || 0) >= 5;
      const hasManyDependents = (metadata.dependentCount || 0) + (metadata.semanticDependentCount || 0) >= 5;
      const fewFunctions = (metadata.functionCount || 0) <= 2;
      // Muchos exports, muchos dependents, pocas funciones = probablemente config
      return exportsMany && hasManyDependents && fewFunctions;
    },
    template: defaultTemplate, // Usa template default
    mergeKey: 'configHubAnalysis',
    fields: ['configKeys', 'consumers', 'riskLevel']
  },
  {
    type: 'entry-point',
    severity: 3,
    detector: (metadata) => {
      const importsMuch = (metadata.importCount || 0) >= 5;
      const nobodyImportsIt = (metadata.dependentCount || 0) + (metadata.semanticDependentCount || 0) === 0;
      // Importa mucho pero nadie lo importa = entry point
      return importsMuch && nobodyImportsIt;
    },
    template: defaultTemplate, // Severity bajo, usa template default
    mergeKey: 'entryPointAnalysis',
    fields: ['bootSequence', 'servicesInitialized']
  },
  {
    type: 'default',
    severity: 0,
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

export default {
  ARCHETYPE_REGISTRY,
  getArchetype,
  detectArchetypes,
  selectArchetypeBySeverity,
  getTemplateForType,
  getMergeConfig,
  listAvailableArchetypes
};

const registryValidation = validateRegistry(ARCHETYPE_REGISTRY);
if (!registryValidation.valid) {
  console.warn('⚠️  ARCHETYPE_REGISTRY validation issues:');
  for (const issue of registryValidation.issues) {
    console.warn(`  - ${issue}`);
  }
}
