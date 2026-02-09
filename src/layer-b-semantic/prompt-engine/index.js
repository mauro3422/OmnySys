/**
 * Prompt Engine - Single Source of Truth (SSoT)
 *
 * Sistema centralizado para gestion de prompts dinamicos basados en metadatos.
 * No permite que llm-analyzer.js crezca, todo el prompting esta centralizado aqui.
 *
 * ARCHITECTURE: Layer B (Prompt Construction) → Layer C (LLM Communication)
 * Bridges static analysis with LLM by creating targeted prompts
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📋 EXTENSION GUIDE - Adding New Prompt Types and Templates
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * To add a new type of LLM analysis with custom prompting:
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * STEP 1: Create Prompt Template
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Create file in: src/layer-b-semantic/prompt-engine/prompt-templates/
 *
 *     // your-analysis-type.js
 *     export const yourAnalysisTypeTemplate = {
 *       name: 'your-analysis-type',
 *       
 *       // When to use this template (based on metadata)
 *       detect: (metadata) => {
 *         // Return true if this template applies
 *         return metadata.hasYourSpecificPattern === true;
 *       },
 *       
 *       // Priority (higher = checked first)
 *       priority: 50,
 *       
 *       // Prompt sections
 *       sections: {
 *         context: `
 * You are analyzing code for SPECIFIC_PATTERN issues.
 * Focus on: X, Y, Z aspects.
 *         `,
 *         
 *         instructions: `
 * 1. Analyze the provided code for PATTERN
 * 2. Identify specific instances
 * 3. Suggest improvements
 *         `,
 *         
 *         outputFormat: `
 * Return JSON with:
 * - findings: Array of found issues
 * - severity: "low" | "medium" | "high" | "critical"
 * - suggestions: Array of improvement suggestions
 *         `
 *       },
 *       
 *       // JSON Schema for response validation
 *       responseSchema: {
 *         type: 'object',
 *         properties: {
 *           findings: {
 *             type: 'array',
 *             items: {
 *               type: 'object',
 *               properties: {
 *                 line: { type: 'number' },
 *                 description: { type: 'string' },
 *                 severity: { 
 *                   type: 'string', 
 *                   enum: ['low', 'medium', 'high', 'critical'] 
 *                 }
 *               },
 *               required: ['line', 'description', 'severity']
 *             }
 *           },
 *           suggestions: {
 *             type: 'array',
 *             items: { type: 'string' }
 *           }
 *         },
 *         required: ['findings', 'suggestions']
 *       }
 *     };
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * STEP 2: Register in PROMPT_REGISTRY.js
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Add to: src/layer-b-semantic/prompt-engine/PROMPT_REGISTRY.js
 *
 *     import { yourAnalysisTypeTemplate } from './prompt-templates/your-analysis-type.js';
 *     
 *     export const PROMPT_REGISTRY = {
 *       // ... existing templates ...
 *       
 *       'your-analysis-type': yourAnalysisTypeTemplate,
 *     };
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * STEP 3: Update PromptSelector (if needed)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * In: src/layer-b-semantic/prompt-engine/prompt-selector.js
 *
 * The selector automatically uses PROMPT_REGISTRY, but you may want to add
 * special selection logic for complex cases:
 *
 *     selectAnalysisType(metadata) {
 *       // Check your template first if high priority
 *       if (yourAnalysisTypeTemplate.detect(metadata)) {
 *         return 'your-analysis-type';
 *       }
 *       
 *       // ... existing logic ...
 *     }
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * STEP 4: Handle Response in LLM Analyzer
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * In: src/layer-b-semantic/llm-analyzer/response-normalizer.js (or create handler)
 *
 * Ensure the LLM response is properly validated and stored:
 *
 *     // Add case for your analysis type
 *     if (analysisType === 'your-analysis-type') {
 *       return {
 *         llmInsights: {
 *           findings: parsed.findings,
 *           suggestions: parsed.suggestions,
 *           analyzedAt: new Date().toISOString()
 *         },
 *         // May also update file metadata
 *         metadata: {
 *           hasYourPatternIssues: parsed.findings.length > 0
 *         }
 *       };
 *     }
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ⚠️  PRINCIPLES TO MAINTAIN
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ✓ SSOT: This is the ONLY place that defines prompts
 *   No other file should construct LLM prompts directly
 *
 * ✓ Anti-hallucination: Every prompt must include rules about:
 *   - Not inventing file names
 *   - Only using provided context
 *   - Exact string matching
 *
 * ✓ JSON Schema: Every template MUST define responseSchema
 *   This validates LLM output before processing
 *
 * ✓ Temperature 0.0: Always use 0.0 for deterministic extraction
 *   (Already set in generatePrompt())
 *
 * ✓ Layer B only: Construct prompts from metadata, don't re-analyze code
 *   The code content is passed for context, but detection logic uses metadata
 *
 * ✓ Declarative templates: Keep logic in 'detect' function, keep prompt text static
 *   BAD: String concatenation in prompt based on conditions
 *   GOOD: Clear sections with all possibilities documented
 *
 * 📊  PROMPT EFFECTIVENESS:
 *     - Monitor LLM response quality
 *     - If responses are inconsistent: tighten the schema
 *     - If responses miss things: improve instructions
 *     - If responses hallucinate: strengthen anti-hallucination rules
 *
 * 🔗  RELATED FILES:
 *     - PROMPT_REGISTRY.js: Central registry of all templates
 *     - prompt-selector.js: Chooses which template to use
 *     - prompt-templates/*.js: Individual template definitions
 *     - llm-analyzer/*.js: Uses this engine to get prompts
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * REGLA: Los schemas en getJsonSchema() deben corresponder SOLO a analysis types
 * activos en PROMPT_REGISTRY.js. Si un arquetipo se elimina, su schema tambien.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import promptSelector from './prompt-selector.js';

class PromptEngine {
  constructor() {
    this.selector = promptSelector;
  }

  /**
   * Genera el prompt completo basado en metadatos del archivo
   * @param {Object} metadata - Metadatos del archivo analizado
   * @param {string} fileContent - Contenido del archivo
   * @returns {Object} Prompt configuration con system prompt, user prompt y schema
   */
  async generatePrompt(metadata, fileContent) {
    // Detectar el tipo de análisis basado en metadatos
    const analysisType = this.selector.selectAnalysisType(metadata);
    
    // Obtener el template específico
    const template = this.selector.getTemplate(analysisType);
    
    // Generar system prompt
    const systemPrompt = this.generateSystemPrompt(template, analysisType);
    
    // Generar user prompt
    const userPrompt = this.generateUserPrompt(template, fileContent, metadata, analysisType);
    
    // Obtener JSON schema
    const jsonSchema = await this.getJsonSchema(analysisType);

    return {
      systemPrompt,
      userPrompt,
      jsonSchema,
      analysisType,
      temperature: 0.0, // Siempre 0.0 para extracción
      maxTokens: 2000
    };
  }

  /**
   * Genera el system prompt con reglas anti-hallucination
   */
  generateSystemPrompt(template, analysisType) {
    const baseRules = `RULES (Anti-Hallucination):
- NEVER invent file names
- ONLY use files mentioned in context
- DO NOT assume connections
- COPY exact string literals from code
- If not found, return empty arrays
- Return ONLY valid JSON with ALL required fields`;

    const specificRules = {
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
      'default': `
DEFAULT RULES:
- Extract general code patterns
- Return exact strings and patterns found
- DO NOT assume patterns not explicitly coded`
    };

    const rules = specificRules[analysisType] || specificRules.default;

    return `${template.systemPrompt}

${baseRules}
${rules}

IMPORTANT: Return ONLY valid JSON with ALL required fields. If not found, return empty arrays.`;
  }

  /**
   * Genera el user prompt con el contenido del archivo y metadatos
   */
  generateUserPrompt(template, fileContent, metadata, analysisType) {
    if (!template) {
      throw new Error(`Template for ${analysisType} is null or undefined`);
    }
    
    if (!template.userPrompt) {
      throw new Error(`Template for ${analysisType} is missing userPrompt. Template keys: ${Object.keys(template).join(', ')}`);
    }

    const fileContentPlaceholder = '__OMNY_FILE_CONTENT__';

    // Helpers to avoid empty metadata lines (token savings)
    const listToString = (value) => {
      if (!Array.isArray(value) || value.length === 0) return '';
      return value.join(', ');
    };
    const formatSemanticConnections = (value) => {
      if (!Array.isArray(value) || value.length === 0) return '';
      return JSON.stringify(value).slice(0, 200);
    };
    const compactMetadataBlock = (text) => {
      const lines = text.split(/\r?\n/);
      const compacted = [];

      for (let line of lines) {
        // Remove empty trailing parentheses, e.g. "EXPORTS: 0 ()"
        line = line.replace(/\s*\(\s*\)\s*$/, '');

        // Remove lines with empty values: "KEY: " or "KEY: []" or "KEY: {}"
        const match = line.match(/^\s*[^:]+:\s*(.*)\s*$/);
        if (match) {
          const value = (match[1] || '').trim();
          if (value === '' || value === '[]' || value === '{}' || value === 'false') {
            continue;
          }
        }

        compacted.push(line);
      }

      return compacted.join('\n');
    };
    
    // Reemplazar todas las variables del template con los metadatos
    let userPrompt = template.userPrompt;
    const placeholders = new Set(template.userPrompt.match(/\{[a-zA-Z0-9_]+\}/g) || []);
    
    // Variables básicas siempre disponibles
    const replacements = {
      '{filePath}': metadata.filePath || 'unknown',
      '{fileContent}': fileContentPlaceholder,
      '{exportCount}': metadata.exportCount || 0,
      '{dependentCount}': metadata.dependentCount || 0,
      '{importCount}': metadata.importCount || 0,
      '{functionCount}': metadata.functionCount || 0,
      '{exports}': listToString(metadata.exports),
      '{dependents}': listToString(metadata.dependents),
      '{hasDynamicImports}': metadata.hasDynamicImports || false,
      '{hasTypeScript}': metadata.hasTypeScript || false,
      '{hasCSSInJS}': metadata.hasCSSInJS || false,
      '{hasLocalStorage}': metadata.hasLocalStorage || false,
      '{hasEventListeners}': metadata.hasEventListeners || false,
      '{hasGlobalAccess}': metadata.hasGlobalAccess || false,
      '{hasAsyncPatterns}': metadata.hasAsyncPatterns || false,
      '{hasJSDoc}': metadata.hasJSDoc || false,
      '{hasSingletonPattern}': metadata.hasSingletonPattern || false,
      '{localStorageKeys}': listToString(metadata.localStorageKeys),
      '{eventNames}': listToString(metadata.eventNames),
      '{envVars}': listToString(metadata.envVars),
      // NUEVO: Variables semánticas críticas
      '{semanticDependentCount}': metadata.semanticDependentCount || 0,
      '{definesGlobalState}': metadata.definesGlobalState || false,
      '{usesGlobalState}': metadata.usesGlobalState || false,
      '{globalStateWrites}': listToString(metadata.globalStateWrites),
      '{globalStateReads}': listToString(metadata.globalStateReads),
      '{hasEventEmitters}': metadata.hasEventEmitters || false,
      '{semanticConnections}': formatSemanticConnections(metadata.semanticConnections)
    };

    const filteredReplacements = {};
    for (const placeholder of placeholders) {
      filteredReplacements[placeholder] = Object.prototype.hasOwnProperty.call(replacements, placeholder)
        ? replacements[placeholder]
        : '';
    }
    
    // Reemplazar todas las variables
    for (const [key, value] of Object.entries(filteredReplacements)) {
      userPrompt = userPrompt.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    }

    // Compact only the metadata section (before the code)
    if (userPrompt.includes(fileContentPlaceholder)) {
      const parts = userPrompt.split(fileContentPlaceholder);
      const before = parts.shift() || '';
      const after = parts.join(fileContentPlaceholder);
      userPrompt = `${compactMetadataBlock(before)}${fileContentPlaceholder}${after}`;
    } else {
      userPrompt = compactMetadataBlock(userPrompt);
    }

    // Reinsert real file content
    userPrompt = userPrompt.replace(fileContentPlaceholder, fileContent || '');

    return userPrompt;
  }

  /**
   * Obtiene el JSON schema para validación
   */
  async getJsonSchema(analysisType) {
    const schemas = {
      'dynamic-imports': 'dynamic-imports.json',
      'semantic-connections': 'semantic-connections.json',
      'default': 'default.json'
    };

    const candidates = [];
    const safeType = typeof analysisType === 'string' && /^[a-z0-9-]+$/i.test(analysisType)
      ? analysisType
      : null;

    if (safeType) {
      candidates.push(`${safeType}.json`);
    }
    if (schemas[analysisType]) {
      candidates.push(schemas[analysisType]);
    }
    candidates.push(schemas.default);

    for (const schemaFile of candidates) {
      try {
        const schemaUrl = new URL(`./json-schemas/${schemaFile}`, import.meta.url);
        const schemaModule = await import(schemaUrl, { assert: { type: 'json' } });
        return schemaModule.default || schemaModule;
      } catch {
        // Try next candidate
      }
    }

    return {};
  }

  /**
   * Valida que el prompt generado sea correcto
   */
  validatePrompt(promptConfig) {
    const required = ['systemPrompt', 'userPrompt', 'jsonSchema', 'analysisType'];
    const missing = required.filter(key => !promptConfig[key]);
    
    if (missing.length > 0) {
      throw new Error(`Prompt validation failed. Missing: ${missing.join(', ')}`);
    }

    if (!promptConfig.systemPrompt.includes('Return ONLY valid JSON')) {
      throw new Error('System prompt must include JSON validation rules');
    }

    return true;
  }
}

export default new PromptEngine();
