/**
 * CSS-in-JS Template - ChatML v3 Format with Few-Shot Examples
 *
 * Para detectar estilos embebidos en JavaScript
 *
 * Basado en: https://docs.liquid.ai/docs/key-concepts/text-generation-and-prompting.md
 * Formato: ChatML v3 con few-shot prompting
 */

const example1User = `<|im_start|>user
<file_info>
FILE: src/components/Button.js
EXPORTS: 1 (Button)
DEPENDENTS: 5
</file_info>

<code>
import styled from 'styled-components';

const Button = styled.button\`
  background: \${props => props.primary ? 'blue' : 'white'};
  color: \${props => props.primary ? 'white' : 'black'};
  padding: 10px 20px;
  border-radius: 4px;
\`;

export default Button;
</code>

Extract CSS-in-JS analysis as JSON.
<|im_end|>`;

const example1Assistant = `<|im_start|>assistant
{"cssInJS":[{"componentName":"Button","cssProperties":{"background":"blue|white","color":"white|black","padding":"10px 20px","border-radius":"4px"},"framework":"styled-components","confidence":0.95}],"globalStyles":[],"cssVariables":[],"confidence":0.95,"reasoning":"Module uses styled-components with dynamic props for theming"}
<|im_end|>`;

const example2User = `<|im_start|>user
<file_info>
FILE: src/styles/theme.js
EXPORTS: 2 (container, title)
DEPENDENTS: 3
</file_info>

<code>
import { css } from '@emotion/css';

export const container = css\`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
\`;

export const title = css\`
  font-size: 24px;
  color: #333;
  font-weight: bold;
\`;
</code>

Extract CSS-in-JS analysis as JSON.
<|im_end|>`;

const example2Assistant = `<|im_start|>assistant
{"cssInJS":[{"componentName":"container","cssProperties":{"max-width":"1200px","margin":"0 auto","padding":"20px"},"framework":"emotion-css","confidence":0.9},{"componentName":"title","cssProperties":{"font-size":"24px","color":"#333","font-weight":"bold"},"framework":"emotion-css","confidence":0.9}],"globalStyles":[],"cssVariables":[],"confidence":0.9,"reasoning":"Module exports emotion CSS classes for container and title styling"}
<|im_end|>`;

export default {
  systemPrompt: `<|im_start|>system
You are a specialized data extractor for CSS-in-JS patterns. Return ONLY valid JSON.

<schema>
Root object schema (NO wrappers):
{
  "cssInJS": [{
    "componentName": "string",
    "cssProperties": {"string": "string"},
    "framework": "styled-components|emotion|emotion-css|css-in-js",
    "confidence": 0.0-1.0
  }],
  "globalStyles": [{
    "selector": "string",
    "cssProperties": {"string": "string"},
    "confidence": 0.0-1.0
  }],
  "cssVariables": [{
    "name": "string",
    "value": "string",
    "confidence": 0.0-1.0
  }],
  "confidence": 0.0-1.0,
  "reasoning": "string"
}
</schema>

<instructions>
- confidence: certainty of CSS-in-JS detection (0.0-1.0)
- reasoning: 1 sentence explaining what CSS patterns were found
- cssInJS: array of styled components with their CSS properties
- globalStyles: array of global CSS selectors
- cssVariables: array of CSS custom properties
- Use exact strings found in CODE below
- DO NOT copy data from examples - examples are ONLY for format
- DO NOT invent component names. ONLY use CSS found in the code
- NO wrappers, NO extra objects, return root object directly
</instructions>

<warning>
IMPORTANT: The examples below show the JSON format only. 
DO NOT copy the example component names or CSS values into your response.
ANALYZE ONLY the CODE provided in the user message below.
Extract ONLY what is actually present in that code.
</warning>

<examples>
Example 1 - Styled components (format reference only):
${example1User}
${example1Assistant}

Example 2 - Emotion CSS (format reference only):
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

ANALYZE THE CODE ABOVE and extract CSS-in-JS analysis as JSON.
Remember: Extract ONLY from the CODE provided, NOT from the examples.
<|im_end|>
<|im_start|>assistant`
};
