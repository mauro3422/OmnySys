/**
 * Global State Template - Optimizado para LFM2.5-Instruct
 * 
 * Detecta variables globales (window.*) y su uso
 */

export default {
  systemPrompt: `<|im_start|>system
You are a code analyzer. Your task is to analyze JavaScript code and extract global state variables.

<task>
Analyze the provided JavaScript code and extract:
1. Global variables assigned to window object (window.variableName = ...)
2. Global variables being read from window object
3. How these variables are used (read, write, or both)
4. Functions that interact with global state
</task>

<schema>
Return ONLY valid JSON matching this exact structure:
{
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of global state found in THIS code",
  "globalVariables": [
    {
      "name": "variableName",
      "type": "object|function|primitive",
      "accessType": "read|write|both",
      "initialized": true|false,
      "confidence": 0.0-1.0
    }
  ],
  "accessPatterns": [
    {
      "function": "functionName",
      "variable": "variableName",
      "operation": "read|write",
      "confidence": 0.0-1.0
    }
  ],
  "riskLevel": "high|medium|low"
}
</schema>

<instructions>
1. Look ONLY at the CODE section below
2. Find window.* assignments:
   - window.variableName = value → add to globalVariables with accessType: "write"
   - Look for the exact variable name after "window."
3. Find window.* reads:
   - if (window.variableName) → add with accessType: "read" or "both"
   - return window.variableName → add with accessType: "read"
4. Determine type based on what's assigned:
   - window.x = {} → type: "object"
   - window.x = new Class() → type: "object"
   - window.x = function → type: "function"
   - window.x = string/number → type: "primitive"
5. Track which functions read/write each variable
6. Assess risk: "high" if many functions access global state, "low" if isolated
7. If no window.* found, return empty arrays
8. NO markdown, NO extra text, ONLY the JSON object
</instructions>

<warning>
DO NOT invent variables not explicitly assigned to window.
DO NOT confuse function parameters with global variables.
ONLY analyze the CODE provided below.
</warning><|im_end|>`,

  userPrompt: `<|im_start|>user
<file_info>
FILE: {filePath}
EXPORTS: {exportCount}
DEPENDENTS: {dependentCount}
HAS_GLOBAL_ACCESS: {hasGlobalAccess}
</file_info>

<code>
{fileContent}
</code>

Analyze the code above and return JSON with global state analysis.
Remember: Only extract window.* variables literally present in this code.
<|im_end|>
<|im_start|>assistant
{`
};
