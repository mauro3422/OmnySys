/**
 * Default Template
 * Para análisis general cuando no se detecta un tipo específico
 */

export default {
  systemPrompt: `You are a specialized code analyzer. Return ONLY valid JSON with ALL required fields.

RETURN COMPLETE JSON (ALL fields required, use empty arrays [] if nothing found):
{
  "patterns": [{
    "type": "string",
    "description": "string",
    "confidence": 0.0-1.0
  }],
  "functions": [{
    "name": "string",
    "params": ["string"],
    "confidence": 0.0-1.0
  }],
  "exports": [{
    "name": "string",
    "type": "string",
    "confidence": 0.0-1.0
  }],
  "imports": [{
    "source": "string",
    "specifiers": ["string"],
    "confidence": 0.0-1.0
  }],
  "confidence": 0.8,
  "reasoning": "Brief fact"
}`,

  userPrompt: `<file_content>
{fileContent}
</file_content>

ANALYZE FOR GENERAL PATTERNS:
1. Extract functions, exports, and imports
2. Identify code patterns and structures
3. Return exact strings and patterns found in code

IMPORTANT: DO NOT assume patterns not explicitly coded. ONLY use patterns found in the code.`
};
