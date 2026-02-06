/**
 * Default Template - ChatML v3 Format with Few-Shot Examples
 *
 * Estandarizado para el sistema plug-and-play de CogniSystem.
 * Todos los templates deben seguir el formato ChatML v3 para máxima compatibilidad.
 *
 * Basado en: https://docs.liquid.ai/docs/key-concepts/text-generation-and-prompting.md
 * Formato: ChatML v3 con few-shot prompting
 */

const example1User = `<|im_start|>user
<file_info>
FILE: src/utils/dateHelpers.js
EXPORTS: 3 (formatDate, parseDate, isWeekend)
DEPENDENTS: 5
IMPORTS: 0
FUNCTIONS: 3
</file_info>

<code>
export function formatDate(date, format) {
  return new Date(date).toLocaleDateString(format);
}

export function parseDate(dateString) {
  return new Date(dateString);
}

export function isWeekend(date) {
  const day = new Date(date).getDay();
  return day === 0 || day === 6;
}
</code>

Extract general analysis as JSON.
<|im_end|>`;

const example1Assistant = `<|im_start|>assistant
{"confidence":0.9,"reasoning":"Module provides date utility functions with clear single responsibility","patterns":[{"type":"utility","description":"Date manipulation helpers","confidence":0.9}],"functions":[{"name":"formatDate","params":["date","format"],"confidence":0.95},{"name":"parseDate","params":["dateString"],"confidence":0.95},{"name":"isWeekend","params":["date"],"confidence":0.95}],"exports":[{"name":"formatDate","type":"function","confidence":0.95},{"name":"parseDate","type":"function","confidence":0.95},{"name":"isWeekend","type":"function","confidence":0.95}],"imports":[]}
<|im_end|>`;

const example2User = `<|im_start|>user
<file_info>
FILE: src/services/api.js
EXPORTS: 2 (getUser, updateUser)
DEPENDENTS: 3
IMPORTS: 2
FUNCTIONS: 2
</file_info>

<code>
import { API_BASE_URL } from '../config.js';
import { authToken } from '../auth.js';

export async function getUser(userId) {
  const response = await fetch(\`\${API_BASE_URL}/users/\${userId}\`);
  return response.json();
}

export async function updateUser(userId, data) {
  const response = await fetch(\`\${API_BASE_URL}/users/\${userId}\`, {
    method: 'PUT',
    headers: { 'Authorization': \`Bearer \${authToken}\` },
    body: JSON.stringify(data)
  });
  return response.json();
}
</code>

Extract general analysis as JSON.
<|im_end|>`;

const example2Assistant = `<|im_start|>assistant
{"confidence":0.95,"reasoning":"API service module with HTTP client pattern and external dependencies","patterns":[{"type":"api-client","description":"HTTP API wrapper functions","confidence":0.95},{"type":"async","description":"Uses async/await for asynchronous operations","confidence":0.9}],"functions":[{"name":"getUser","params":["userId"],"confidence":0.95},{"name":"updateUser","params":["userId","data"],"confidence":0.95}],"exports":[{"name":"getUser","type":"async-function","confidence":0.95},{"name":"updateUser","type":"async-function","confidence":0.95}],"imports":[{"source":"../config.js","specifiers":["API_BASE_URL"],"confidence":0.95},{"source":"../auth.js","specifiers":["authToken"],"confidence":0.95}]}
<|im_end|>`;

export default {
  systemPrompt: `<|im_start|>system
You are a specialized data extractor for general code analysis. Return ONLY valid JSON.

<schema>
Root object schema (NO wrappers):
{
  "confidence": 0.0-1.0,
  "reasoning": "string",
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
  }]
}
</schema>

<instructions>
- confidence: certainty of the overall analysis (0.0-1.0)
- reasoning: 1 sentence explaining what patterns were found
- patterns: array of architectural or design patterns detected
- functions: array of functions with their parameters
- exports: array of exported symbols
- imports: array of imported modules
- Use exact strings found in CODE below
- DO NOT copy data from examples - examples are ONLY for format
- NO wrappers, NO extra objects, return root object directly
</instructions>

<warning>
IMPORTANT: The examples below show the JSON format only. 
DO NOT copy the example function names or patterns into your response.
ANALYZE ONLY the CODE provided in the user message below.
Extract ONLY what is actually present in that code.
</warning>

<examples>
Example 1 - Utility module with patterns (format reference only):
${example1User}
${example1Assistant}

Example 2 - Module with imports (format reference only):
${example2User}
${example2Assistant}
</examples><|im_end|>`,

  userPrompt: `<|im_start|>user
<file_info>
FILE: {filePath}
EXPORTS: {exportCount} ({exports})
DEPENDENTS: {dependentCount}
SEMANTIC_DEPENDENTS: {semanticDependentCount}
IMPORTS: {importCount}
FUNCTIONS: {functionCount}
DEFINES_GLOBAL_STATE: {definesGlobalState}
USES_GLOBAL_STATE: {usesGlobalState}
GLOBAL_WRITES: {globalStateWrites}
GLOBAL_READS: {globalStateReads}
HAS_EVENT_EMITTERS: {hasEventEmitters}
HAS_EVENT_LISTENERS: {hasEventListeners}
EVENT_NAMES: {eventNames}
SEMANTIC_CONNECTIONS: {semanticConnections}
</file_info>

<code>
{fileContent}
</code>

ANALYZE THE CODE ABOVE and extract general analysis as JSON.
Remember: Extract ONLY from the CODE provided, NOT from the examples.
<|im_end|>
<|im_start|>assistant`
};
