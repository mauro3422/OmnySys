import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { readAllFiles } from './utils/script-utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_PATH = path.join(__dirname, '..');

async function main() {
  console.log('\n🔍 Investigating Unknown Files');
  console.log('═'.repeat(70));
  
  const files = await readAllFiles(ROOT_PATH);
  
  // Find unknown files
  const unknownFiles = [];
  for (const [filePath, data] of files) {
    if (data.culture === 'unknown' || !data.culture) {
      unknownFiles.push({ filePath, data });
    }
  }
  
  console.log(`\n📁 Total unknown files: ${unknownFiles.length}`);
  
  // Group by extension
  const byExtension = {};
  for (const { filePath } of unknownFiles) {
    const ext = path.extname(filePath) || 'no-ext';
    if (!byExtension[ext]) byExtension[ext] = [];
    byExtension[ext].push(filePath);
  }
  
  console.log('\n📊 BY EXTENSION:');
  for (const [ext, files] of Object.entries(byExtension).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`   ${ext}: ${files.length}`);
  }
  
  // Show all files
  console.log('\n📋 ALL UNKNOWN FILES:');
  for (const { filePath, data } of unknownFiles) {
    const definitions = data.definitions?.length || 0;
    const exports = data.exports?.length || 0;
    const imports = data.imports?.length || 0;
    const objectExports = data.objectExports?.length || 0;
    
    console.log(`\n   ${filePath}`);
    console.log(`      definitions: ${definitions}, exports: ${exports}, imports: ${imports}, objectExports: ${objectExports}`);
  }
  
  // Recommendations
  console.log('\n' + '═'.repeat(70));
  console.log('💡 RECOMMENDATIONS:');
  console.log('═'.repeat(70));
  
  const emptyFiles = unknownFiles.filter(f => {
    const d = f.data;
    return (d.definitions?.length || 0) === 0 && 
           (d.exports?.length || 0) === 0 && 
           (d.imports?.length || 0) === 0;
  });
  
  const styleFiles = unknownFiles.filter(f => f.filePath.endsWith('.css'));
  const dataFiles = unknownFiles.filter(f => f.filePath.endsWith('.json') && !f.filePath.includes('.omnysysdata'));
  const typeFiles = unknownFiles.filter(f => f.filePath.endsWith('.d.ts'));
  
  console.log(`\n   Empty files (no content): ${emptyFiles.length}`);
  console.log(`   Style files (.css): ${styleFiles.length}`);
  console.log(`   Data files (.json): ${dataFiles.length}`);
  console.log(`   Type definition files (.d.ts): ${typeFiles.length}`);
  console.log(`   Other: ${unknownFiles.length - emptyFiles.length - styleFiles.length - dataFiles.length - typeFiles.length}`);
  
  console.log('\n');
}

main().catch(console.error);