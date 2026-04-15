/**
 * Diagnostic script: Find exact source of policy drifts and standardization gaps
 */

import { scanCompilerPolicyDrift } from './src/shared/compiler/scan.js';

const findings = await scanCompilerPolicyDrift(process.cwd(), { limit: 100 });

console.log(`\n=== POLICY DRIFT FINDINGS: ${findings.length} total ===\n`);

// Group by policy area
const byArea = {};
for (const f of findings) {
  const area = f.policyArea || 'unknown';
  if (!byArea[area]) byArea[area] = [];
  byArea[area].push(f);
}

for (const [area, areaFindings] of Object.entries(byArea)) {
  console.log(`\n📍 POLICY AREA: ${area} (${areaFindings.length} findings)`);
  console.log('-'.repeat(60));
  for (const f of areaFindings) {
    console.log(`  - ${f.filePath}`);
    console.log(`    Rule: ${f.rule}`);
    console.log(`    Severity: ${f.severity}`);
    console.log(`    Message: ${f.message?.substring(0, 100)}...`);
    console.log();
  }
}

console.log('\n=== SUMMARY BY AREA ===');
for (const [area, areaFindings] of Object.entries(byArea)) {
  console.log(`  ${area}: ${areaFindings.length}`);
}
