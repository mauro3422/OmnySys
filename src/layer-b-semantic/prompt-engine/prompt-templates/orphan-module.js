/**
 * Orphan Module Template - ChatML v3 Format
 * 
 * Estandarizado para el sistema plug-and-play de CogniSystem.
 * Detecta módulos huérfanos (sin dependencias) y sugiere usos potenciales.
 */

export default {
  systemPrompt: `<|im_start|>system
You are a specialized data extractor for orphan module analysis. Return ONLY valid JSON.

Schema (root object, NO wrappers):
{
  "confidence": 0.0-1.0,
  "reasoning": "string",
  "isOrphan": boolean,
  "potentialUsage": ["string"],
  "suggestedUsage": "string"
}

Instructions:
- confidence: certainty of orphan detection (0.0-1.0)
- reasoning: 1 sentence explaining why this module is orphan
- isOrphan: true if module has no dependents
- potentialUsage: array of potential use cases for this module
- suggestedUsage: brief suggestion on how to use or remove this module
- Use exact strings found in code
- DO NOT invent data not present in code
- NO wrappers, NO extra objects, return root object directly<|im_end|>`,

  userPrompt: `<|im_start|>user
FILE: {filePath}
EXPORTS: {exportCount} ({exports})
DEPENDENTS: {dependentCount}
HAS_JSDOC: {hasJSDoc}

CODE:
{fileContent}

ANALYZE FOR ORPHAN MODULE:
1. Verify module has no dependents (dependentCount === 0)
2. Check what exports are available
3. Identify potential usage scenarios
4. Suggest integration or removal strategy

Extract orphan module analysis as JSON.<|im_end|>
<|im_start|>assistant`
};
