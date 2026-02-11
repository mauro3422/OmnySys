/**
 * Test con debug logging del Tunnel Vision Detector
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = __dirname;

async function debugTunnelVision() {
  console.log('\n🔍 Debug: Tunnel Vision Detector\n');
  console.log('━'.repeat(60));

  const testFile = 'src/layer-a-static/query/index.js';

  // Step 1: Load system-map
  const mapPath = path.join(PROJECT_ROOT, '.omnysysdata', 'system-map.json');
  const systemMap = JSON.parse(await fs.readFile(mapPath, 'utf-8'));

  console.log('\n📦 Step 1: System map loaded');
  console.log(`   Total files: ${Object.keys(systemMap.files).length}`);

  // Step 2: Find file in system-map
  const normalizedPath = testFile.replace(/^src[\\/]/, '').replace(/\\/g, '/');
  console.log(`\n📝 Step 2: Looking for file`);
  console.log(`   Original path: ${testFile}`);
  console.log(`   Normalized path: ${normalizedPath}`);
  console.log(`   Exact path in map: ${systemMap.files[testFile] ? testFile : 'NOT FOUND'}`);

  const fileData = systemMap.files[testFile];

  if (!fileData) {
    console.log('\n❌ File not found in system-map!');
    console.log('\n   Available paths starting with "src/layer-a-static/query":');
    Object.keys(systemMap.files)
      .filter(k => k.startsWith('src/layer-a-static/query'))
      .forEach(k => console.log(`     - ${k}`));
    return;
  }

  console.log(`\n✅ File found in system-map!`);
  console.log(`   usedBy count: ${fileData.usedBy?.length || 0}`);

  if (fileData.usedBy && fileData.usedBy.length > 0) {
    console.log(`\n📋 Dependents (usedBy):`);
    fileData.usedBy.slice(0, 5).forEach((dep, i) => {
      console.log(`   ${i + 1}. ${dep}`);
    });
    if (fileData.usedBy.length > 5) {
      console.log(`   ... y ${fileData.usedBy.length - 5} más`);
    }
  }

  // Step 3: Check recent modifications
  console.log(`\n⏰ Step 3: Recent modifications tracking`);
  console.log(`   (all dependents should be "not recently modified" for test)`);

  // Step 4: Simulate detection
  console.log(`\n🎯 Step 4: Should detect tunnel vision if:`);
  console.log(`   - File has >= 2 dependents: ${fileData.usedBy?.length >= 2 ? '✓ YES' : '✗ NO'}`);
  console.log(`   - Dependents not recently modified: ✓ YES (assuming fresh state)`);

  console.log('\n━'.repeat(60));
}

debugTunnelVision().catch(console.error);
