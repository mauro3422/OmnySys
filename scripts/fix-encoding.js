/**
 * Script para fixear caracteres de codificación corruptos
 * Usa secuencias hex para evitar problemas de encoding
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Crear mapa de reemplazos usando Buffer para evitar problemas de encoding
const createReplacements = () => {
  const reps = [];
  
  // Helper para crear entrada de reemplazo
  const add = (corruptHex, correctStr) => {
    const corrupt = Buffer.from(corruptHex.split(' ').map(h => parseInt(h, 16))).toString('utf8');
    reps.push([corrupt, correctStr]);
  };
  
  // Caracteres corruptos comunes
  add('f0 9f 94 8d', '🔍'); // lupa
  add('f0 9f 93 8a', '📊'); // gráfico barras  
  add('e2 9c 93', '✓');    // check simple
  add('f0 9f 94 97', '🔗'); // link
  add('f0 9f 93 88', '📈'); // gráfico subiendo
  add('f0 9f 8f 97', '🏗'); // construcción
  add('e2 84 b9', 'ℹ');    // info
  add('f0 9f 94 a7', '🔧'); // wrench
  add('e2 9a a0', '⚠');    // warning
  add('e2 9c 85', '✅');    // check verde
  add('f0 9f 9a 80', '🚀'); // rocket
  add('f0 9f 8e 89', '🎉'); // celebración
  add('f0 9f 93 81', '📁'); // folder
  add('f0 9f 91 81', '👁'); // ojo
  add('f0 9f a4 94', '🤔'); // pensando
  add('f0 9f 92 a1', '💡'); // idea
  add('f0 9f 93 8d', '📍'); // pin
  add('f0 9f 8e a8', '🎨'); // arte
  add('f0 9f 93 8b', '📋'); // clipboard
  add('f0 9f 93 8c', '📌'); // pushpin
  add('f0 9f 94 a8', '🛠'); // tools
  add('f0 9f 94 a5', '🔥'); // fire
  add('f0 9f 94 8e', '🔎'); // lupa derecha
  add('e2 9e 9c', '➜');    // flecha
  add('e2 86 92', '→');    // flecha derecha
  add('e2 97 8f', '●');    // circulo
  add('f0 9f 92 be', '💾'); // diskette
  add('e2 99 a5', '♥');    // corazón
  add('e2 98 80', '☀');    // sol
  add('e2 98 81', '☁');    // nube
  add('e2 9a a1', '⚡');    // rayo
  
  return reps;
};

const replacements = createReplacements();

async function fixFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    let newContent = content;
    let hasChanges = false;

    for (const [corrupt, correct] of replacements) {
      if (newContent.includes(corrupt)) {
        newContent = newContent.split(corrupt).join(correct);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      await fs.writeFile(filePath, newContent, 'utf-8');
      console.log(`Fixed: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error fixing ${filePath}: ${error.message}`);
    return false;
  }
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.log('Usage: node fix-encoding.js <file1> <file2> ...');
  process.exit(1);
}

let fixedCount = 0;
for (const file of files) {
  if (await fixFile(file)) fixedCount++;
}

console.log(`\nFixed ${fixedCount} files`);
