/**
 * Cognitive Vaccines - Anti-hallucination rules
 * Basado en LFM2_OPTIMIZATION.md
 *
 * REGLA: Solo agregar reglas para analysis types que existan activamente
 * en PROMPT_REGISTRY.js. Si un arquetipo se elimina del registry, su regla
 * aqui tambien debe eliminarse. No dejar codigo muerto.
 */

class CognitiveVaccines {
  /**
   * Reglas base para todos los análisis
   */
  getBaseRules() {
    return `RULES (Anti-Hallucination):
- NEVER invent file names
- ONLY use files mentioned in context
- DO NOT assume connections
- COPY exact string literals from code
- If not found, return empty arrays
- Return ONLY valid JSON with ALL required fields`;
  }

  /**
   * Reglas específicas por tipo de análisis
   */
  getSpecificRules(analysisType) {
    const rules = {
      'dynamic-imports': `
DYNAMIC IMPORTS RULES:
- Analyze routeMap objects to resolve dynamic paths
- Extract exact string literals: "./modules/moduleName.js"
- Map variables to actual module names: UserModule, AdminModule, DashboardModule
- DO NOT invent file paths
- ONLY use patterns found in code`,
      
      'semantic-connections': `
SEMANTIC CONNECTIONS RULES:
- Extract localStorage keys: setItem, getItem, removeItem
- Extract event names: addEventListener, dispatchEvent
- Map connections between files using exact paths
- DO NOT assume connections not explicitly coded
- Return exact file paths: "./modules/UserModule.js"`,
      
      'default': `
DEFAULT RULES:
- Extract general code patterns
- Return exact strings and patterns found
- DO NOT assume patterns not explicitly coded`
    };

    return rules[analysisType] || rules.default;
  }
}

export default new CognitiveVaccines();
