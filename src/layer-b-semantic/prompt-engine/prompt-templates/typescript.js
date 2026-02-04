/**
 * TypeScript Template
 * Para detectar tipos, interfaces y clases
 */

export default {
  systemPrompt: `You are a specialized code analyzer for TypeScript patterns. Return ONLY valid JSON with ALL required fields.

RETURN COMPLETE JSON (ALL fields required, use empty arrays [] if nothing found):
{
  "interfaces": [{
    "name": "string",
    "properties": {"string": "string"},
    "extends": ["string"],
    "confidence": 0.0-1.0
  }],
  "types": [{
    "name": "string",
    "definition": "string",
    "confidence": 0.0-1.0
  }],
  "classes": [{
    "name": "string",
    "extends": "string",
    "implements": ["string"],
    "methods": ["string"],
    "confidence": 0.0-1.0
  }],
  "generics": [{
    "name": "string",
    "constraints": ["string"],
    "confidence": 0.0-1.0
  }],
  "confidence": 0.8,
  "reasoning": "Brief fact"
}`,

  userPrompt: `<file_content>
{fileContent}
</file_content>

ANALYZE FOR TYPESCRIPT:
1. Extract interfaces, types, and class definitions
2. Identify generic constraints and type parameters
3. Map inheritance and implementation relationships
4. Return exact type names and definitions found in code

IMPORTANT: DO NOT invent type definitions. ONLY use types found in the code.`
};