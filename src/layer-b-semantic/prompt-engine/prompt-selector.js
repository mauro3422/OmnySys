/**
 * Prompt Selector - Usa PROMPT_REGISTRY
 *
 * Sistema plug & play: solo necesitas registrar en PROMPT_REGISTRY.js
 *
 * Este selector delega toda la logica de deteccion al PROMPT_REGISTRY,
 * eliminando el acoplamiento implicito entre detectores y templates.
 *
 * REGLA: Este selector SOLO debe elegir arquetipos que detecten patrones
 * de CONEXION entre archivos. No debe existir logica de deteccion aqui -
 * toda la deteccion esta en PROMPT_REGISTRY.js. Si necesitas agregar un
 * nuevo arquetipo, registralo alla, no aqui.
 */

import { 
  detectArchetypes, 
  selectArchetypeBySeverity,
  getTemplateForType,
  ARCHETYPE_REGISTRY
} from './prompt-registry/index.js';
import { validateMetadata } from '../metadata-contract/index.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:prompt:selector');



class PromptSelector {
  /**
   * Selecciona el tipo de análisis basado en metadatos
   * 
   * @param {Object} metadata - Metadatos del archivo (debe cumplir con MetadataContract)
   * @returns {string} Tipo de análisis seleccionado
   * @throws {Error} Si los metadatos son inválidos
   */
  selectAnalysisType(metadata) {
    // Validar metadatos (solo en modo debug)
    if (process.env.DEBUG_METADATA) {
      const validation = validateMetadata(metadata);
      if (!validation.valid) {
        logger.warn('⚠️  Invalid metadata:', validation);
        // No lanzar error, usar default
        return 'default';
      }
    }

    // Detectar TODOS los arquetipos presentes usando el registry
    const detected = detectArchetypes(metadata);
    
    if (detected.length === 0) {
      return 'default';
    }
    
    // Seleccionar el de mayor severidad
    return selectArchetypeBySeverity(detected);
  }

  /**
   * Obtiene el template para un tipo de análisis
   * 
   * @param {string} analysisType - Tipo de análisis
   * @returns {Object} Template de prompt con systemPrompt y userPrompt
   */
  getTemplate(analysisType) {
    const template = getTemplateForType(analysisType);
    
    // Validar que el template tenga las propiedades necesarias
    if (!template || !template.systemPrompt || !template.userPrompt) {
      logger.warn(`⚠️  Invalid template for type: ${analysisType}`);
      
      // Fallback a default
      const defaultTemplate = getTemplateForType('default');
      if (defaultTemplate && defaultTemplate.systemPrompt && defaultTemplate.userPrompt) {
        return defaultTemplate;
      }
      
      // Último recurso: template básico
      return {
        systemPrompt: `<|im_start|>system
You are a code analyzer. Return ONLY valid JSON.

Schema (root object, NO wrappers):
{
  "confidence": 0.0-1.0,
  "reasoning": "string"
}

Instructions:
- confidence: certainty of analysis (0.0-1.0)
- reasoning: 1 sentence explaining what was found
- NO wrappers, NO extra objects, return root object directly<|im_end|>`,
        userPrompt: `<|im_start|>user
FILE: {filePath}

CODE:
{fileContent}

Extract analysis as JSON.<|im_end|>
<|im_start|>assistant`
      };
    }
    
    return template;
  }

  /**
   * Lista todos los arquetipos disponibles
   * 
   * @returns {Array} Array de objetos con type, severity, mergeKey, fields
   */
  listAvailableArchetypes() {
    return ARCHETYPE_REGISTRY.map(a => ({
      type: a.type,
      severity: a.severity,
      mergeKey: a.mergeKey,
      fields: a.fields
    }));
  }

  /**
   * Detecta todos los arquetipos que coinciden con los metadatos
   * Útil para debugging y análisis
   * 
   * @param {Object} metadata - Metadatos del archivo
   * @returns {Array} Array de {type, severity} de arquetipos detectados
   */
  detectAllArchetypes(metadata) {
    return detectArchetypes(metadata);
  }

  /**
   * Verifica si un arquetipo específico está presente
   * 
   * @param {Object} metadata - Metadatos del archivo
   * @param {string} archetypeType - Tipo de arquetipo a verificar
   * @returns {boolean} true si el arquetipo está presente
   */
  hasArchetype(metadata, archetypeType) {
    const detected = detectArchetypes(metadata);
    return detected.some(a => a.type === archetypeType);
  }
}

export default new PromptSelector();
