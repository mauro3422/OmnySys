import fs from 'fs/promises';
import path from 'path';
import { exists, resolveProjectPath } from '../utils/paths.js';

export async function cleanLogic(projectPath, options = {}) {
  const { silent = false } = options;
  const absolutePath = resolveProjectPath(projectPath);

  try {
    const averPath = path.join(absolutePath, '.aver');
    const omnysysPath = path.join(absolutePath, 'omnysysdata');

    const cleaned = [];
    const notFound = [];

    if (await exists(averPath)) {
      await fs.rm(averPath, { recursive: true, force: true });
      cleaned.push('.aver/');
    } else {
      notFound.push('.aver/');
    }

    if (await exists(omnysysPath)) {
      await fs.rm(omnysysPath, { recursive: true, force: true });
      cleaned.push('omnysysdata/');
    } else {
      notFound.push('omnysysdata/');
    }

    return {
      success: true,
      exitCode: 0,
      projectPath: absolutePath,
      cleaned,
      notFound,
      cleanedCount: cleaned.length
    };
  } catch (error) {
    return {
      success: false,
      exitCode: 1,
      error: error.message,
      projectPath: absolutePath
    };
  }
}

export async function clean(projectPath) {
  const absolutePath = resolveProjectPath(projectPath);

  console.log('\nCleaning OmniSystem data\n');
  console.log(`Project: ${absolutePath}\n`);

  const result = await cleanLogic(projectPath);

  if (result.success) {
    if (result.cleaned.length > 0) {
      result.cleaned.forEach(item => console.log(`  Removed ${item}`));
    }
    if (result.cleanedCount === 0) {
      console.log('  No analysis data found');
    }
    console.log('\nCleanup complete!\n');
  } else {
    console.error('\nCleanup failed:');
    console.error(`   ${result.error}\n`);
  }

  process.exit(result.exitCode);
}
