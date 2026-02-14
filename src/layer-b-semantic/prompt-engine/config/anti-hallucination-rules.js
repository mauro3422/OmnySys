/**
 * @fileoverview Anti-Hallucination Rules
 * 
 * Reglas específicas por tipo de análisis para prevenir alucinaciones del LLM.
 * Centralizado para mantener consistencia y facilitar actualizaciones.
 * 
 * @module prompt-engine/config/anti-hallucination-rules
 * @version 1.0.0
 */

/**
 * Reglas base aplicables a todos los tipos de análisis
 */
export const BASE_RULES = `RULES (Anti-Hallucination):
- NEVER invent file names
- ONLY use files mentioned in context
- DO NOT assume connections
- COPY exact string literals from code
- If not found, return empty arrays
- Return ONLY valid JSON with ALL required fields`;

/**
 * Reglas específicas por tipo de análisis
 */
export const SPECIFIC_RULES = {
  'dynamic-imports': `
DYNAMIC IMPORTS RULES:
- Analyze routeMap objects to resolve dynamic paths
- Extract exact string literals: "./modules/moduleName.js"
- Map variables to actual module names
- DO NOT invent file paths
- ONLY use patterns found in code`,

  'semantic-connections': `
SEMANTIC CONNECTIONS RULES:
- Extract localStorage keys: setItem, getItem, removeItem
- Extract event names: addEventListener, dispatchEvent
- Map connections between files using exact paths
- DO NOT assume connections not explicitly coded
- Return exact file paths`,

  'god-object': `
GOD OBJECT RULES:
- Count actual responsibilities in code
- DO NOT guess responsibilities not visible
- Use exact function and class names
- Report specific line numbers`,

  'orphan-module': `
ORPHAN MODULE RULES:
- Verify no imports from other files
- Suggest realistic usage patterns
- DO NOT invent potential dependents`,

  'singleton': `
SINGLETON RULES:
- Identify actual singleton implementation
- Report exact initialization pattern
- Note thread-safety if applicable`,

  'default': `
DEFAULT RULES:
- Extract general code patterns
- Return exact strings and patterns found
- DO NOT assume patterns not explicitly coded`
};

/**
 * Obtiene las reglas anti-hallucination para un tipo de análisis
 * @param {string} analysisType - Tipo de análisis
 * @returns {string} - Reglas formateadas
 */
export function getRulesForType(analysisType) {
  const specific = SPECIFIC_RULES[analysisType] || SPECIFIC_RULES.default;
  return `${BASE_RULES}
${specific}

IMPORTANT: Return ONLY valid JSON with ALL required fields. If not found, return empty arrays.`;
}

/**
 * Verifica si un tipo de análisis tiene reglas específicas
 * @param {string} analysisType - Tipo de análisis
 * @returns {boolean} - True si tiene reglas específicas
 */
export function hasSpecificRules(analysisType) {
  return analysisType in SPECIFIC_RULES && analysisType !== 'default';
}

/**
 * Lista todos los tipos de análisis soportados
 * @returns {Array<string>} - Lista de tipos
 */
export function getSupportedAnalysisTypes() {
  return Object.keys(SPECIFIC_RULES).filter(type => type !== 'default');
}
