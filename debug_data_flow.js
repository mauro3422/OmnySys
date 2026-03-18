import { extractDataFlow } from './src/layer-a-static/extractors/data-flow/index.js';

const code = `
  const double = x => x * 2;
  const result = 5 |> double(#);
`;

const result = extractDataFlow(code);
console.log('RESULT:', JSON.stringify(result, null, 2));
