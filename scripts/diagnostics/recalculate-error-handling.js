/**
 * Recalcula hasErrorHandling para todos los átomos existentes
 *-basándose en el código fuente
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = '.omnysysdata/omnysys.db';

console.log('🔄 Recalculating hasErrorHandling for existing atoms...\n');

const db = new Database(DB_PATH);

// Obtener todos los átomos con su file_path y line
const atoms = db.prepare(`
  SELECT id, file_path, line_start, line_end 
  FROM atoms 
  WHERE file_path IS NOT NULL
`).all();

console.log(`📊 Processing ${atoms.length} atoms...`);

const errorPatterns = [
  /try\s*\{/,
  /catch\s*\(/,
  /\.catch\s*\(/,
  /if\s*\(.*\)\s*throw/,
  /Promise\.catch/,
  /function\s*\([^)]*err/i,
  /\(err,\s*\w+\)/
];

let updated = 0;
const updateStmt = db.prepare(`
  UPDATE atoms SET has_error_handling = ? WHERE id = ?
`);

for (const atom of atoms) {
  try {
    if (!atom.file_path || !fs.existsSync(atom.file_path)) continue;
    
    const content = fs.readFileSync(atom.file_path, 'utf-8');
    const lines = content.split('\n');
    
    // Obtener el código de la función
    const start = Math.max(0, (atom.line_start || 1) - 1);
    const end = Math.min(lines.length, atom.line_end || start + 50);
    const functionCode = lines.slice(start, end).join('\n');
    
    // Verificar patrones de error handling
    const hasErrorHandling = errorPatterns.some(pattern => pattern.test(functionCode));
    
    if (hasErrorHandling) {
      updateStmt.run(1, atom.id);
      updated++;
    }
  } catch (e) {
    // Silently skip errors
  }
}

console.log(`✅ Updated ${updated} atoms with error handling`);

// Verificar
const stats = db.prepare('SELECT has_error_handling, COUNT(*) as count FROM atoms GROUP BY has_error_handling').all();
console.log('\n📈 Distribución final:');
stats.forEach(s => console.log(`  ${s.has_error_handling}: ${s.count}`));

db.close();
