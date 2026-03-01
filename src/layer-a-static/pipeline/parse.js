import { parseFileFromDisk } from '../../layer-a-static/parser/index.js';
import { createLogger } from '../../utils/logger.js';
import { startTimer, BatchTimer } from '../../utils/performance-tracker.js';

const logger = createLogger('OmnySys:parse');

export async function parseFiles(files, verbose = true) {
  const totalTimer = startTimer('Parse all files');
  if (verbose) logger.info('📝 Parsing files...');
  const parsedFiles = {};

  // ✅ BATCHES DE 20 con POOL REUTILIZABLE
  // Los 20 parsers del pool se reutilizan en cada batch
  // Memoria: ~60MB fijos (parsers) + ~40MB temporales (árboles) = 100MB pico
  const BATCH_SIZE = 20;
  const batchTimer = new BatchTimer('File parsing', files.length);

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(files.length / BATCH_SIZE);

    if (verbose) {
      logger.info(`  ${i}/${files.length} files parsed... (${batch.length} in current batch)`);
    }

    const timerBatch = startTimer(`Batch ${batchNum}/${totalBatches}`);

    // ✅ Los parsers YA ESTÁN CREADOS (pool), solo se reutilizan
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

    batchTimer.onItemProcessed(batch.length);
    timerBatch.end(verbose);

    // Yield al event loop para no bloquear
    if (i + BATCH_SIZE < files.length) {
      await new Promise(resolve => setImmediate(resolve));
    }
  }

  const stats = batchTimer.end(verbose);
  const totalResult = totalTimer.end(verbose);

  if (verbose) {
    logger.info(`  ✓ All files parsed: ${stats.items} files @ ${stats.rate.toFixed(1)}/s in ${totalResult.elapsed.toFixed(0)}ms\n`);
  }

  return parsedFiles;
}
