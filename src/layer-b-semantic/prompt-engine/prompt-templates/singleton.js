/**
 * Singleton Pattern Template - ChatML v3 Format with Few-Shot Examples
 *
 * Estandarizado para el sistema plug-and-play de CogniSystem.
 * Detecta patrones Singleton y analiza sus características.
 *
 * Basado en: https://docs.liquid.ai/docs/key-concepts/text-generation-and-prompting.md
 * Formato: ChatML v3 con few-shot prompting
 */

const example1User = `<|im_start|>user
<file_info>
FILE: src/ConfigManager.js
EXPORTS: 1 (getInstance)
FUNCTIONS: 3
HAS_SINGLETON_PATTERN: true
</file_info>

<code>
let instance = null;

class ConfigManager {
  constructor() {
    if (instance) return instance;
    this.config = {};
    instance = this;
  }
  
  static getInstance() {
    if (!instance) {
      instance = new ConfigManager();
    }
    return instance;
  }
  
  setConfig(key, value) {
    this.config[key] = value;
  }
  
  getConfig(key) {
    return this.config[key];
  }
}

export function getInstance() {
  return ConfigManager.getInstance();
}
</code>

Extract Singleton analysis as JSON.
<|im_end|>`;

const example1Assistant = `<|im_start|>assistant
{"confidence":0.95,"reasoning":"Module implements classic lazy singleton pattern with getInstance method","instanceCount":1,"globalState":["instance","config"],"threadSafety":"unsafe","initializationPattern":"lazy"}
<|im_end|>`;

const example2User = `<|im_start|>user
<file_info>
FILE: src/Logger.js
EXPORTS: 1 (logger)
FUNCTIONS: 2
HAS_SINGLETON_PATTERN: true
</file_info>

<code>
class Logger {
  constructor() {
    this.logs = [];
  }
  
  log(message) {
    this.logs.push({ message, timestamp: Date.now() });
    console.log(message);
  }
}

export const logger = new Logger();
</code>

Extract Singleton analysis as JSON.
<|im_end|>`;

const example2Assistant = `<|im_start|>assistant
{"confidence":0.9,"reasoning":"Module exports single instance created at module load time","instanceCount":1,"globalState":["logs"],"threadSafety":"unknown","initializationPattern":"eager"}
<|im_end|>`;

export default {
  systemPrompt: `<|im_start|>system
You are a specialized data extractor for Singleton pattern analysis. Return ONLY valid JSON.

<schema>
Root object schema (NO wrappers):
{
  "confidence": 0.0-1.0,
  "reasoning": "string",
  "instanceCount": 0,
  "globalState": ["string"],
  "threadSafety": "safe|unsafe|unknown",
  "initializationPattern": "eager|lazy|none"
}
</schema>

<instructions>
- confidence: certainty of Singleton pattern detection (0.0-1.0)
- reasoning: 1 sentence explaining the assessment
- instanceCount: number of instances created (should be 0 or 1 for Singleton)
- globalState: array of global state variables managed by the singleton
- threadSafety: "safe" if thread-safe implementation, "unsafe" otherwise
- initializationPattern: how the instance is created (eager, lazy, or none)
- Use exact strings found in CODE below
- DO NOT copy data from examples - examples are ONLY for format
- NO wrappers, NO extra objects, return root object directly
</instructions>

<warning>
IMPORTANT: The examples below show the JSON format only. 
DO NOT copy the example class names or state variables into your response.
ANALYZE ONLY the CODE provided in the user message below.
Extract ONLY what is actually present in that code.
</warning>

<examples>
Example 1 - Lazy singleton with global state (format reference only):
${example1User}
${example1Assistant}

Example 2 - Eager singleton (format reference only):
${example2User}
${example2Assistant}
</examples><|im_end|>`,

  userPrompt: `<|im_start|>user
<file_info>
FILE: {filePath}
EXPORTS: {exportCount} ({exports})
FUNCTIONS: {functionCount}
HAS_SINGLETON_PATTERN: {hasSingletonPattern}
</file_info>

<code>
{fileContent}
</code>

ANALYZE THE CODE ABOVE and extract Singleton analysis as JSON.
Remember: Extract ONLY from the CODE provided, NOT from the examples.
<|im_end|>
<|im_start|>assistant`
};
