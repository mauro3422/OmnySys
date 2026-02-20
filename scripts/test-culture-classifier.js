import { classifyFileCulture, CULTURES } from '../src/layer-a-static/analysis/file-culture-classifier.js';

// Test cases
const tests = [
  { filePath: 'src/config/limits.js', functions: [], objectExports: [{name:'BATCH'}], exports: [] },
  { filePath: 'src/layer-a-static/index.js', functions: [], exports: ['parse', 'analyze'] },
  { filePath: 'tests/unit/parser.test.js', functions: [{name:'test'}], exports: [] },
  { filePath: 'scripts/audit.js', functions: [{name:'main'}], exports: [] },
  { filePath: 'src/core/parser.js', functions: [{name:'parse'}], exports: ['parse'] },
];

console.log('=== File Culture Classifier Tests ===\n');
for (const test of tests) {
  const result = classifyFileCulture(test);
  console.log(`${result.symbol} ${test.filePath}`);
  console.log(`   Culture: ${result.culture}`);
  console.log(`   Role: ${result.role}\n`);
}