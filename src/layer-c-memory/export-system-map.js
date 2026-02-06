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
import { exportFullSystemMapToFile } from '../layer-a-static/storage/query-service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  try {
    // Parsear argumentos
    const args = process.argv.slice(2);
    const projectPath = args[0] ? path.resolve(args[0]) : process.cwd();
    const outputPath = args[1] ? path.resolve(args[1]) : null;

    console.log('📊 OmnySys - Export Full System Map (Debug)');
    console.log('='.repeat(50));
    console.log(`Project path: ${projectPath}`);
    if (outputPath) {
      console.log(`Output file: ${outputPath}`);
    } else {
      console.log('Output file: .omnysysdata/debug/system-map-full.json (default)');
    }
    console.log('');
    console.log('⏳ Exporting system map...\n');

    const startTime = Date.now();

    // Exportar
    const result = await exportFullSystemMapToFile(projectPath, outputPath);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(50));
    console.log('✅ Export completed successfully!');
    console.log('='.repeat(50));
    console.log(`✓ File: ${result.filePath}`);
    console.log(`✓ Size: ${result.sizeKB} KB`);
    console.log(`✓ Files exported: ${result.filesExported}`);
    console.log(`✓ Duration: ${duration}s`);
    console.log('');
    console.log('📝 This is a DEBUG FILE - contains the complete system map.');
    console.log('   Use it for debugging, comparison, or full analysis.');
    console.log('');
    console.log('💡 For normal queries, use the partitioned API instead:');
    console.log('   - getProjectMetadata()');
    console.log('   - getFileAnalysis(filePath)');
    console.log('   - getSemanticConnections()');
    console.log('   - getRiskAssessment()');

    process.exit(0);
  } catch (error) {
    console.error('❌ Export failed:');
    console.error(error.message);
    console.error('');
    console.error('Usage:');
    console.error('  node export-system-map.js [projectPath] [outputPath]');
    console.error('');
    console.error('Examples:');
    console.error('  node export-system-map.js');
    console.error('  node export-system-map.js /path/to/project');
    console.error('  node export-system-map.js . custom-output.json');
    process.exit(1);
  }
}

main();
