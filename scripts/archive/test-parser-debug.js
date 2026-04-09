import { parseFile } from '../src/layer-a-static/parser/index.js';

const code = `
  import { foo, bar } from './module.js';
  export default function main() {}
  console.log('test');
`;

const result = parseFile('/test/file.js', code);
console.log('Imports:', JSON.stringify(result.imports, null, 2));
console.log('\nExports:', JSON.stringify(result.exports, null, 2));
console.log('\nCalls sample:', JSON.stringify(result.calls.slice(0, 5), null, 2));
