/**
 * Singleton Pattern Template - ChatML v3 Format
 * 
 * Estandarizado para el sistema plug-and-play de CogniSystem.
 * Detecta patrones Singleton y analiza sus características.
 */

export default {
  systemPrompt: `<|im_start|>system
You are a specialized data extractor for Singleton pattern analysis. Return ONLY valid JSON.

Schema (root object, NO wrappers):
{
  "confidence": 0.0-1.0,
  "reasoning": "string",
  "instanceCount": 0,
  "globalState": ["string"],
  "threadSafety": "safe|unsafe|unknown",
  "initializationPattern": "eager|lazy|none"
}

Instructions:
- confidence: certainty of Singleton pattern detection (0.0-1.0)
- reasoning: 1 sentence explaining the assessment
- instanceCount: number of instances created (should be 0 or 1 for Singleton)
- globalState: array of global state variables managed by the singleton
- threadSafety: "safe" if thread-safe implementation, "unsafe" otherwise
- initializationPattern: how the instance is created (eager, lazy, or none)
- Use exact strings found in code
- DO NOT invent data not present in code
- NO wrappers, NO extra objects, return root object directly<|im_end|>`,

  userPrompt: `<|im_start|>user
FILE: {filePath}
EXPORTS: {exportCount} ({exports})
FUNCTIONS: {functionCount}
HAS_SINGLETON_PATTERN: {hasSingletonPattern}

CODE:
{fileContent}

ANALYZE FOR SINGLETON PATTERN:
1. Verify getInstance() method exists
2. Check for static instance property
3. Identify global state managed
4. Assess thread safety
5. Determine initialization pattern

Extract Singleton analysis as JSON.<|im_end|>
<|im_start|>assistant`
};
