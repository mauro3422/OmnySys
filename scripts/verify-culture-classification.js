import fs from 'fs';

// Check a few different file types
const files = [
  '.omnysysdata/files/src/config/limits.js.json',      // laws
  '.omnysysdata/files/src/layer-a-static/index.js.json', // gatekeeper
  '.omnysysdata/files/tests/unit/layer-c/mcp/pipeline.test.js.json', // auditor
  '.omnysysdata/files/scripts/audit-atoms-correct.js.json', // script
  '.omnysysdata/files/src/core/cache/singleton.js.json'  // citizen
];

console.log('=== File Culture Classification Results ===\n');
for (const f of files) {
  try {
    const data = JSON.parse(fs.readFileSync(f, 'utf-8'));
    const path = data.path || f;
    console.log(`${data.culture || 'N/A'} ${path}`);
    console.log(`   Role: ${data.cultureRole || 'N/A'}\n`);
  } catch(e) {
    console.log(`Error reading: ${f}\n`);
  }
}