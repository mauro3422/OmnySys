/**
 * Semantic Connections Template
 * Para detectar conexiones semánticas entre archivos
 */

export default {
  systemPrompt: `You are a specialized code analyzer for semantic connections. Return ONLY valid JSON with ALL required fields.

RETURN COMPLETE JSON (ALL fields required, use empty arrays [] if nothing found):
{
  "localStorageKeys": ["string"],
  "eventNames": ["string"],
  "connections": [{
    "source": "string",
    "target": "string", 
    "key": "string",
    "type": "localStorage|event|shared-state",
    "confidence": 0.0-1.0
  }],
  "sharedState": [{
    "key": "string",
    "accessType": "read|write|both",
    "files": ["string"],
    "confidence": 0.0-1.0
  }],
  "confidence": 0.8,
  "reasoning": "Brief fact"
}`,

  userPrompt: `<file_content>
{fileContent}
</file_content>

ANALYZE FOR SEMANTIC CONNECTIONS:
1. Extract localStorage keys: setItem, getItem, removeItem
2. Extract event names: addEventListener, dispatchEvent
3. Map connections between files using exact paths
4. Identify shared state patterns
5. Return exact file paths and keys found in code

IMPORTANT: DO NOT assume connections not explicitly coded. ONLY use files and keys mentioned in context.`
};