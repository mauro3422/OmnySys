/**
 * CSS-in-JS Template
 * Para detectar estilos embebidos en JavaScript
 */

export default {
  systemPrompt: `You are a specialized code analyzer for CSS-in-JS patterns. Return ONLY valid JSON with ALL required fields.

RETURN COMPLETE JSON (ALL fields required, use empty arrays [] if nothing found):
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
  "confidence": 0.8,
  "reasoning": "Brief fact"
}`,

  userPrompt: `<file_content>
{fileContent}
</file_content>

ANALYZE FOR CSS-IN-JS:
1. Extract styled components and CSS-in-JS patterns
2. Identify component names and CSS properties
3. Detect global styles and CSS variables
4. Return exact component names and CSS found in code

IMPORTANT: DO NOT invent component names. ONLY use CSS found in the code.`
};