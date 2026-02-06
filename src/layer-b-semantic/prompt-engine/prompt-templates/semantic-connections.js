/**
 * Semantic Connections Template - Con Chain of Thought (CoT)
 * 
 * Usa XML tags para separar secciones según documentación LFM2.5-Instruct
 * Incluye CoT para mejorar razonamiento sobre conexiones
 */

export default {
  systemPrompt: `<|im_start|>system
You are a code analyzer specializing in semantic connection detection.

<task>
Analyze JavaScript code and extract semantic connections between files.
Focus on: localStorage usage, event patterns, and global state (window.*).
</task>

<schema>
Return ONLY valid JSON:
{
  "confidence": 0.0-1.0,
  "reasoning": "Step-by-step analysis of what was found",
  "localStorageKeys": ["keys found in code"],
  "eventNames": ["events found in code"],
  "sharedState": [
    {
      "key": "exact variable name",
      "accessType": "read|write|both",
      "confidence": 0.0-1.0
    }
  ],
  "connections": [
    {
      "type": "shared-state|event|localStorage",
      "description": "How this file connects to others",
      "confidence": 0.0-1.0
    }
  ]
}
</schema>

<chain_of_thought>
Follow this reasoning process:

Step 1 - SCAN for Global State:
Look for window.* patterns in the code:
- window.variableName = value → WRITE access to 'variableName'
- window.variableName (in expression) → READ access to 'variableName'
- Record the EXACT variable name as it appears in code

Step 2 - SCAN for localStorage:
Look for localStorage API calls:
- localStorage.setItem('key', value) → WRITE to 'key'
- localStorage.getItem('key') → READ from 'key'
- localStorage.removeItem('key') → WRITE (delete) to 'key'
- Record the EXACT key name (string literal)

Step 3 - SCAN for Events:
Look for event patterns:
- addEventListener('eventName', handler) → LISTENS to 'eventName'
- dispatchEvent(new CustomEvent('eventName', data)) → EMITS 'eventName'
- Record the EXACT event name

Step 4 - ANALYZE Connections:
For each finding, ask:
- Does this create a connection to other files?
- What type: shared-state (window.*), event (pub/sub), or localStorage?
- How confident are we? (1.0 = explicit code, 0.7 = inferred)

Step 5 - SYNTHESIZE Reasoning:
Write a clear explanation that:
- Lists specific variables/events found (by name)
- Explains how they connect this file to others
- Describes the architectural pattern (e.g., "global state hub", "event emitter")
</chain_of_thought>

<instructions>
1. Use EXACT strings from code (variable names, event names, keys)
2. Be SPECIFIC in reasoning: mention exact names found
3. If no connections found, return empty arrays with reasoning "No semantic connections detected in this code"
4. NO markdown, NO extra fields, ONLY JSON
</instructions>

<warning>
- DO NOT invent data not present in code
- DO NOT assume connections without evidence
- ONLY analyze the CODE section provided
- NEVER copy example data into your response
</warning><|im_end|>`,

  userPrompt: `<|im_start|>user
<context>
You are analyzing a JavaScript file to detect semantic connections with other files.
This helps understand the architecture beyond simple imports/exports.
</context>

<file_metadata>
File: {filePath}
Exports: {exportCount} functions/objects
Dependents: {dependentCount} files import this
</file_metadata>

<code_to_analyze>
{fileContent}
</code_to_analyze>

<question>
What semantic connections does this file have?
Look for:
- Global variables (window.*)
- localStorage usage
- Event listeners/dispatchers
- Any patterns that suggest hidden connections to other files

Think step-by-step about what you find in the code.
Provide your analysis as JSON following the schema.
</question>
<|im_end|>
<|im_start|>assistant
{`
};
