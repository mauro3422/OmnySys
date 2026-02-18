import path from 'path';
import { exportFullSystemMapToFile } from '../../layer-a-static/query/apis/export-api.js';
import { hasExistingAnalysis } from '#core/storage/setup/index.js';
import { resolveProjectPath } from '../utils/paths.js';

export async function exportMapLogic(projectPath, options = {}) {
  const { silent = false } = options;
  const absolutePath = resolveProjectPath(projectPath);

  if (!silent) {
    console.log('\nExporting System Map\n');
    console.log(`Project: ${absolutePath}\n`);
  }

  try {
    const hasAnalysis = await hasExistingAnalysis(absolutePath);
    if (!hasAnalysis) {
      if (!silent) {
        console.error('No analysis data found!');
        console.error('\nRun first:');
        console.error('   omnysystem analyze <project>\n');
      }
      return { success: false, error: 'No analysis data found', exitCode: 1 };
    }

    const result = await exportFullSystemMapToFile(absolutePath);

    if (result.success) {
      if (!silent) {
        console.log('Export successful!\n');
        console.log(`File: ${path.basename(result.filePath)}`);
        console.log(`Size: ${result.sizeKB} KB`);
        console.log(`Files: ${result.filesExported}\n`);
      }
      return {
        success: true,
        exitCode: 0,
        filePath: result.filePath,
        sizeKB: result.sizeKB,
        filesExported: result.filesExported
      };
    } else {
      throw new Error('Export failed (unknown reason)');
    }
  } catch (error) {
    if (!silent) {
      console.error('\nExport failed:');
      console.error(`   ${error.message}\n`);
    }
    return { success: false, error: error.message, exitCode: 1 };
  }
}

export async function exportMap(projectPath) {
  const result = await exportMapLogic(projectPath);
  process.exit(result.exitCode);
}
