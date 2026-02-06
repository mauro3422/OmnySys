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
import cssInJSTemplate from './prompt-templates/css-in-js.js';
import typescriptTemplate from './prompt-templates/typescript.js';
import singletonTemplate from './prompt-templates/singleton.js';
import orphanModuleTemplate from './prompt-templates/orphan-module.js';
import globalStateTemplate from './prompt-templates/global-state.js';
import defaultTemplate from './prompt-templates/default.js';
import { validateRegistry } from './registry-validator.js';

// Importar detectores compartidos
import { detectGodObject, detectOrphanModule } from '../metadata-contract.js';

/**
 * REGISTRO DE ARQUETIPOS
 * 
 * Cada entrada define:
 * - type: Identificador único (kebab-case)
 * - severity: Prioridad arquitectónica (0-10, mayor = más prioritario)
 * - detector: Función que recibe metadata y retorna boolean
 * - template: Prompt template (systemPrompt, userPrompt)
 * - mergeKey: Clave en llmInsights donde se guardará el resultado
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
    detector: (metadata) => {
      // Solo es orphan si NO tiene dependents estáticos NI semánticos
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
    type: 'styled-component',
    severity: 3,
    detector: (metadata) => metadata.hasCSSInJS === true,
    template: cssInJSTemplate,
    mergeKey: 'cssInJSAnalysis',
    fields: ['cssInJS', 'globalStyles']
  },
  {
    type: 'type-definer',
    severity: 2,
    detector: (metadata) => metadata.hasTypeScript === true,
    template: typescriptTemplate,
    mergeKey: 'typescriptAnalysis',
    fields: ['interfaces', 'types', 'generics']
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
