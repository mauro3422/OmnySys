/**
 * God Object Pattern Template - ChatML v3 Format with Few-Shot Examples
 *
 * Formato ChatML funciona mejor que XML Fencing para LFM2-Extract:
 * - <|im_start|>system<|im_end|>
 * - <|im_start|>user<|im_end|>
 * - <|im_start|>assistant
 *
 * Basado en tests: v3 (ChatML) tuvo 100% validación vs 0% en XML
 * Basado en: https://docs.liquid.ai/docs/key-concepts/text-generation-and-prompting.md
 */

const example1User = `<|im_start|>user
<file_info>
FILE: src/App.js
EXPORTS: 15 (init, render, update, handleClick, handleSubmit, fetchData, saveData, validateForm, showModal, hideModal, login, logout, getUser, setTheme, getConfig)
DEPENDENTS: 25
</file_info>

<code>
export function init() { /* app initialization */ }
export function render() { /* UI rendering */ }
export function update() { /* state updates */ }
export function handleClick() { /* event handling */ }
export function handleSubmit() { /* form handling */ }
export function fetchData() { /* API calls */ }
export function saveData() { /* data persistence */ }
export function validateForm() { /* validation */ }
export function showModal() { /* UI */ }
export function hideModal() { /* UI */ }
export function login() { /* auth */ }
export function logout() { /* auth */ }
export function getUser() { /* user data */ }
export function setTheme() { /* theming */ }
export function getConfig() { /* configuration */ }
</code>

Extract God Object analysis as JSON.
<|im_end|>`;

const example1Assistant = `<|im_start|>assistant
{"confidence":0.95,"riskLevel":"high","responsibilities":["app-initialization","ui-rendering","state-management","event-handling","api-calls","data-persistence","validation","ui-modals","authentication","user-management","theming","configuration"],"impactScore":0.9,"reasoning":"Module has 25 dependents and handles 12 different responsibilities violating single responsibility principle"}
<|im_end|>`;

const example2User = `<|im_start|>user
<file_info>
FILE: src/utils/logger.js
EXPORTS: 3 (log, error, warn)
DEPENDENTS: 8
</file_info>

<code>
export function log(message) { logger.info(message); }
export function error(message) { logger.error(message); }
export function warn(message) { logger.warn(message); }
</code>

Extract God Object analysis as JSON.
<|im_end|>`;

const example2Assistant = `<|im_start|>assistant
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:god:object');


{"confidence":0.9,"riskLevel":"low","responsibilities":["logging"],"impactScore":0.2,"reasoning":"Module has focused responsibility on logging only, despite having 8 dependents"}
<|im_end|>`;

export default {
  systemPrompt: `<|im_start|>system
You are a specialized data extractor for God Object pattern analysis. Return ONLY valid JSON.

<schema>
Root object schema (NO wrappers):
{
  "confidence": 0.0-1.0,
  "riskLevel": "high|medium|low|none",
  "responsibilities": ["string"],
  "impactScore": 0.0-1.0,
  "reasoning": "string"
}
</schema>

<instructions>
- confidence: certainty of God Object pattern (0.0-1.0)
- riskLevel: "high" if >10 dependents with mixed responsibilities
- responsibilities: extract from export purposes (e.g., ["logging", "config", "auth"])
- impactScore: architectural risk 0.0-1.0
- reasoning: 1 sentence explaining the assessment
- Use exact strings found in CODE below
- DO NOT copy data from examples - examples are ONLY for format
- NO wrappers, NO extra objects, return root object directly
</instructions>

<warning>
IMPORTANT: The examples below show the JSON format only. 
DO NOT copy the example function names or responsibilities into your response.
ANALYZE ONLY the CODE provided in the user message below.
Extract ONLY what is actually present in that code.
</warning>

<examples>
Example 1 - High risk God Object (format reference only):
${example1User}
${example1Assistant}

Example 2 - Low risk utility module (format reference only):
${example2User}
${example2Assistant}
</examples><|im_end|>`,

  userPrompt: `<|im_start|>user
<file_info>
FILE: {filePath}
EXPORTS: {exportCount} ({exports})
DEPENDENTS: {dependentCount}
</file_info>

<code>
{fileContent}
</code>

ANALYZE THE CODE ABOVE and extract God Object analysis as JSON.
Remember: Extract ONLY from the CODE provided, NOT from the examples.
<|im_end|>
<|im_start|>assistant`
};
