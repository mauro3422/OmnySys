/**
 * Cognitive Vaccines - Anti-hallucination rules
 * Basado en LFM2_OPTIMIZATION.md
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
      
      'css-in-js': `
CSS-IN-JS RULES:
- Extract styled components and CSS-in-JS patterns
- Return component names and CSS properties
- DO NOT invent component names
- ONLY use CSS found in the code`,
      
      'typescript': `
TYPESCRIPT RULES:
- Extract interfaces, types, and class definitions
- Return exact type names and definitions
- DO NOT invent type definitions
- ONLY use types found in the code`,
      
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
