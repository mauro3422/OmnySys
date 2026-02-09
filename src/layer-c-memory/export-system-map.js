#!/usr/bin/env node

/**
 * CLI: Exportar System Map Completo
 *
 * Uso:
 *   node export-system-map.js [projectPath] [outputPath]
 *
 * Ejemplos:
 *   node export-system-map.js                    # Usa directorio actual, salida en .omnysysdata/debug/
 *   node export-system-map.js /ruta/proyecto     # Proyecto específico, salida en .omnysysdata/debug/
 *   node export-system-map.js . debug-map.json   # Proyecto actual, salida personalizada
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { exportFullSystemMapToFile } from '../layer-a-static/query/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { createLogger } from '../utils/logger.js';

const logger = createLogger('OmnySys:export:system:map');



async function main() {
  try {
    // Parsear argumentos
    const args = process.argv.slice(2);
    const projectPath = args[0] ? path.resolve(args[0]) : process.cwd();
    const outputPath = args[1] ? path.resolve(args[1]) : null;

    logger.info('📊 OmnySys - Export Full System Map (Debug)');
    logger.info('='.repeat(50));
    logger.info(`Project path: ${projectPath}`);
    if (outputPath) {
      logger.info(`Output file: ${outputPath}`);
    } else {
      logger.info('Output file: .omnysysdata/debug/system-map-full.json (default)');
    }
    logger.info('');
    logger.info('⏳ Exporting system map...\n');

    const startTime = Date.now();

    // Exportar
    const result = await exportFullSystemMapToFile(projectPath, outputPath);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    logger.info('\n' + '='.repeat(50));
    logger.info('✅ Export completed successfully!');
    logger.info('='.repeat(50));
    logger.info(`✓ File: ${result.filePath}`);
    logger.info(`✓ Size: ${result.sizeKB} KB`);
    logger.info(`✓ Files exported: ${result.filesExported}`);
    logger.info(`✓ Duration: ${duration}s`);
    logger.info('');
    logger.info('📝 This is a DEBUG FILE - contains the complete system map.');
    logger.info('   Use it for debugging, comparison, or full analysis.');
    logger.info('');
    logger.info('💡 For normal queries, use the partitioned API instead:');
    logger.info('   - getProjectMetadata()');
    logger.info('   - getFileAnalysis(filePath)');
    logger.info('   - getSemanticConnections()');
    logger.info('   - getRiskAssessment()');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Export failed:');
    logger.error(error.message);
    logger.error('');
    logger.error('Usage:');
    logger.error('  node export-system-map.js [projectPath] [outputPath]');
    logger.error('');
    logger.error('Examples:');
    logger.error('  node export-system-map.js');
    logger.error('  node export-system-map.js /path/to/project');
    logger.error('  node export-system-map.js . custom-output.json');
    process.exit(1);
  }
}

main();
