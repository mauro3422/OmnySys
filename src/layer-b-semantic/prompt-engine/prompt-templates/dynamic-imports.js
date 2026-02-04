/**
 * Dynamic Imports Template
 * Especializado para detectar dynamic imports con variables
 */

export default {
  systemPrompt: `You are a specialized code analyzer for dynamic imports. Return ONLY valid JSON with ALL required fields.

RETURN COMPLETE JSON (ALL fields required, use empty arrays [] if nothing found):
{
  "dynamicImports": [{
    "pattern": "string",
    "variable": "string", 
    "resolvedPaths": ["string"],
    "confidence": 0.0-1.0
  }],
  "staticImports": ["string"],
  "routeMapAnalysis": {
    "variables": ["string"],
    "mappings": {"string": "string"},
    "confidence": 0.0-1.0
  },
  "confidence": 0.8,
  "reasoning": "Brief fact"
}`,

  userPrompt: `<file_content>
{fileContent}
</file_content>

ANALYZE FOR DYNAMIC IMPORTS:
1. Find all import() expressions with variables
2. Extract routeMap objects and variable mappings
3. Resolve dynamic paths to actual file names
4. Return exact string literals found in code

IMPORTANT: DO NOT invent file names. ONLY use files mentioned in context.`
};