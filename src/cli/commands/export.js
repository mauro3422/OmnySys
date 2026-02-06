import path from 'path';
import { exportFullSystemMapToFile } from '../../layer-a-static/query/index.js';
import { hasExistingAnalysis } from '../../layer-a-static/storage/storage-manager.js';
import { resolveProjectPath } from '../utils/paths.js';

export async function exportMap(projectPath) {
  const absolutePath = resolveProjectPath(projectPath);

  console.log('\nExporting System Map\n');
  console.log(`Project: ${absolutePath}\n`);

  try {
    const hasAnalysis = await hasExistingAnalysis(absolutePath);
    if (!hasAnalysis) {
      console.error('No analysis data found!');
      console.error('\nRun first:');
      console.error('   omnysystem analyze <project>\n');
      process.exit(1);
    }

    const result = await exportFullSystemMapToFile(absolutePath);

    if (result.success) {
      console.log('Export successful!\n');
      console.log(`File: ${path.basename(result.filePath)}`);
      console.log(`Size: ${result.sizeKB} KB`);
      console.log(`Files: ${result.filesExported}\n`);
    } else {
      throw new Error('Export failed (unknown reason)');
    }

    process.exit(0);
  } catch (error) {
    console.error('\nExport failed:');
    console.error(`   ${error.message}\n`);
    process.exit(1);
  }
}
