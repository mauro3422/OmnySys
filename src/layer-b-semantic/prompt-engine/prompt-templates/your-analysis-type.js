/**
 * @fileoverview your-analysis-type.js
 *
 * Plantilla de ejemplo para el sistema de prompts de OmnySys.
 * Este archivo sirve como REFERENCIA / TEMPLATE para crear nuevos tipos de análisis.
 *
 * Para agregar un nuevo tipo de análisis LLM:
 * 1. Copia este archivo con el nombre de tu análisis
 * 2. Implementa detect(), sections y responseSchema
 * 3. Registra en PROMPT_REGISTRY.js
 *
 * @see src/layer-b-semantic/prompt-engine/index.js (EXTENSION GUIDE)
 * @module layer-b-semantic/prompt-engine/prompt-templates/your-analysis-type
 * @status EXAMPLE - No usar en producción directamente
 */

/**
 * Template de ejemplo para análisis personalizado.
 * Reemplazar "your-analysis-type" con el nombre real del análisis.
 */
export const yourAnalysisTypeTemplate = {
  /** Nombre único del tipo de análisis */
  name: 'your-analysis-type',

  /**
   * Función de detección: retorna true si este template aplica al archivo.
   * @param {Object} metadata - Metadatos del archivo (desde Layer A)
   * @returns {boolean}
   */
  detect: (metadata) => {
    // Ejemplo: activar para archivos con tu patrón específico
    // return metadata.hasYourSpecificPattern === true;
    return false; // Deshabilitado en el template base
  },

  /** Prioridad de selección (mayor = se evalúa primero) */
  priority: 50,

  /** Secciones del prompt */
  sections: {
    context: `You are analyzing a JavaScript/TypeScript file for [YOUR_ANALYSIS_TYPE] patterns.`,

    instructions: `
- Identify [YOUR_SPECIFIC_PATTERNS] in the provided code
- Return confidence scores between 0.0 and 1.0
- Only include what you actually find in the code
- Do NOT invent patterns that aren't present
`,

    outputFormat: `Return a JSON object with the following structure:
{
  "detected": boolean,
  "confidence": 0.0-1.0,
  "findings": [],
  "reasoning": "string"
}`
  },

  /** Schema de validación para la respuesta del LLM */
  responseSchema: {
    type: 'object',
    required: ['detected', 'confidence', 'findings', 'reasoning'],
    properties: {
      detected: { type: 'boolean' },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      findings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            description: { type: 'string' },
            line: { type: 'number' }
          }
        }
      },
      reasoning: { type: 'string' }
    }
  }
};

export default yourAnalysisTypeTemplate;
