// Versión 2 - Estrategia: Ejemplos con placeholders genéricos

const strategies = {
  'generic-examples': (metadata, code) => ({
    systemPrompt: `<|im_start|>system
You are a code analyzer. Extract semantic connections.

SCHEMA:
{
  "confidence": 0.0-1.0,
  "reasoning": "Brief description",
  "localStorageKeys": ["KEY1", "KEY2"],
  "eventNames": ["EVENT1", "EVENT2"],
  "sharedState": [{"key": "VARNAME", "accessType": "read|write"}]
}

EXAMPLES (different files, for format only):

Example 1:
Code: localStorage.setItem('user', 'john')
Output: {"confidence":1.0,"reasoning":"Writes to localStorage","localStorageKeys":["user"],"eventNames":[],"sharedState":[]}

Example 2:
Code: window.appState = { count: 0 }
Output: {"confidence":1.0,"reasoning":"Creates global state","localStorageKeys":[],"eventNames":[],"sharedState":[{"key":"appState","accessType":"write"}]}

Example 3:
Code: window.addEventListener('click', handler)
Output: {"confidence":1.0,"reasoning":"Listens to click events","localStorageKeys":[],"eventNames":["click"],"sharedState":[]}

NOW ANALYZE THE CODE BELOW (different from examples):<|im_end|>`,

    userPrompt: `<|im_start|>user
File: ${metadata.filePath}

Code:
${code}

JSON output:<|im_end|>
<|im_start|>assistant`
  })
};

// Exportar para usar en el script principal
export { strategies };
