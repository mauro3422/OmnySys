import { parseFileFromDisk } from '../parser/index.js';

export async function parseFiles(files, verbose = true) {
  if (verbose) console.log('📝 Parsing files...');
  const parsedFiles = {};

  // PROCESAMIENTO EN PARALELO POR BATCHES
  const BATCH_SIZE = 20; // Procesar 20 archivos en paralelo

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    
    if (verbose) {
      console.log(`  ${i}/${files.length} files parsed... (${batch.length} in current batch)`);
    }

    // Procesar batch en paralelo
    const results = await Promise.all(
      batch.map(async (file) => {
        const parsed = await parseFileFromDisk(file);
        return { file, parsed };
      })
    );

    // Guardar resultados
    results.forEach(({ file, parsed }) => {
      parsedFiles[file] = parsed;
    });

    // Yield al event loop para no bloquear
    if (i + BATCH_SIZE < files.length) {
      await new Promise(resolve => setImmediate(resolve));
    }
  }

  if (verbose) console.log('  ✓ All files parsed\n');
  return parsedFiles;
}
