/**
 * @fileoverview check-windows-hide.js
 * Scans the codebase for child_process calls missing windowsHide: true.
 */
import fs from 'fs/promises';
import path from 'path';
import { scanDir } from './script-utils.js';

const ROOT_PATH = process.cwd();

async function runAudit() {
  console.log('\n🔍 Windows Visibility Audit');
  console.log('═'.repeat(70));
  
  const files = await scanDir(path.join(ROOT_PATH, 'src'));
  const scripts = await scanDir(path.join(ROOT_PATH, 'scripts'));
  const allFiles = [...files, ...scripts];
  
  let violations = 0;
  
  for (const file of allFiles) {
    if (file.includes('check-windows-hide.js')) continue;
    
    const content = await fs.readFile(file, 'utf-8');
    
    // Check for spawn, exec, execFile, spawnSync, execSync, execFileSync
    const patterns = [
      { name: 'spawn', regex: /spawn\s*\([^,]+,\s*\[[^\]]*\],?\s*([^)]*)\)/g },
      { name: 'exec', regex: /exec\s*\([^,]+,\s*([^)]*)\)/g },
      { name: 'execSync', regex: /execSync\s*\([^,]+,\s*([^)]*)\)/g },
      { name: 'execFile', regex: /execFile\s*\([^,]+,\s*\[[^\]]*\],?\s*([^)]*)\)/g }
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.regex.exec(content)) !== null) {
        const options = match[1];
        if (!options || !options.includes('windowsHide: true')) {
          // Check if it's just a string or missing the property
          console.log(`❌ Missing windowsHide in ${path.relative(ROOT_PATH, file)}:`);
          console.log(`   Pattern: ${pattern.name}`);
          console.log(`   Context: ${match[0].substring(0, 100)}...`);
          violations++;
        }
      }
    }
  }
  
  console.log('\n' + '═'.repeat(70));
  if (violations === 0) {
    console.log('✅ No windowsHide violations found!');
  } else {
    console.log(`⚠️ Found ${violations} potential violations.`);
  }
}

runAudit().catch(console.error);
