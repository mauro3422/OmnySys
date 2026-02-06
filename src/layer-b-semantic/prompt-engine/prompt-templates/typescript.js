/**
 * TypeScript Template - ChatML v3 Format with Few-Shot Examples
 *
 * Para detectar tipos, interfaces y clases
 *
 * Basado en: https://docs.liquid.ai/docs/key-concepts/text-generation-and-prompting.md
 * Formato: ChatML v3 con few-shot prompting
 */

const example1User = `<|im_start|>user
<file_info>
FILE: src/types/user.ts
EXPORTS: 3 (User, UserRole, UserPreferences)
DEPENDENTS: 8
</file_info>

<code>
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export type UserRole = 'admin' | 'user' | 'guest';

export interface UserPreferences {
  theme: 'light' | 'dark';
  notifications: boolean;
}
</code>

Extract TypeScript analysis as JSON.
<|im_end|>`;

const example1Assistant = `<|im_start|>assistant
{"interfaces":[{"name":"User","properties":{"id":"string","name":"string","email":"string","role":"UserRole"},"extends":[],"confidence":0.95},{"name":"UserPreferences","properties":{"theme":"'light' | 'dark'","notifications":"boolean"},"extends":[],"confidence":0.95}],"types":[{"name":"UserRole","definition":"'admin' | 'user' | 'guest'","confidence":0.95}],"classes":[],"generics":[],"confidence":0.95,"reasoning":"Module defines User and UserPreferences interfaces plus UserRole type alias"}
<|im_end|>`;

const example2User = `<|im_start|>user
<file_info>
FILE: src/utils/ApiClient.ts
EXPORTS: 1 (ApiClient)
DEPENDENTS: 5
</file_info>

<code>
export class ApiClient<T> {
  private baseUrl: string;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }
  
  async get(id: string): Promise<T> {
    const response = await fetch(\`\${this.baseUrl}/\${id}\`);
    return response.json();
  }
  
  async post(data: T): Promise<T> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return response.json();
  }
}
</code>

Extract TypeScript analysis as JSON.
<|im_end|>`;

const example2Assistant = `<|im_start|>assistant
{"interfaces":[],"types":[],"classes":[{"name":"ApiClient","extends":"","implements":[],"methods":["get","post"],"confidence":0.95}],"generics":[{"name":"T","constraints":[],"confidence":0.9}],"confidence":0.95,"reasoning":"Generic ApiClient class with type parameter T for API operations"}
<|im_end|>`;

export default {
  systemPrompt: `<|im_start|>system
You are a specialized data extractor for TypeScript patterns. Return ONLY valid JSON.

<schema>
Root object schema (NO wrappers):
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
  "confidence": 0.0-1.0,
  "reasoning": "string"
}
</schema>

<instructions>
- confidence: certainty of TypeScript analysis (0.0-1.0)
- reasoning: 1 sentence explaining what TypeScript patterns were found
- interfaces: array of interface definitions with properties
- types: array of type aliases
- classes: array of class definitions with inheritance
- generics: array of generic type parameters
- Use exact strings found in CODE below
- DO NOT copy data from examples - examples are ONLY for format
- DO NOT invent type definitions. ONLY use types found in the code
- NO wrappers, NO extra objects, return root object directly
</instructions>

<warning>
IMPORTANT: The examples below show the JSON format only. 
DO NOT copy the example type names or properties into your response.
ANALYZE ONLY the CODE provided in the user message below.
Extract ONLY what is actually present in that code.
</warning>

<examples>
Example 1 - Interface and type definitions (format reference only):
${example1User}
${example1Assistant}

Example 2 - Generic class (format reference only):
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

ANALYZE THE CODE ABOVE and extract TypeScript analysis as JSON.
Remember: Extract ONLY from the CODE provided, NOT from the examples.
<|im_end|>
<|im_start|>assistant`
};
