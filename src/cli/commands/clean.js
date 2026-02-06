import fs from 'fs/promises';
import path from 'path';
import { exists, resolveProjectPath } from '../utils/paths.js';

export async function clean(projectPath) {
  const absolutePath = resolveProjectPath(projectPath);

  console.log('\nCleaning OmniSystem data\n');
  console.log(`Project: ${absolutePath}\n`);

  try {
    const averPath = path.join(absolutePath, '.aver');
    const omnysysPath = path.join(absolutePath, 'omnysysdata');

    let cleaned = 0;

    if (await exists(averPath)) {
      await fs.rm(averPath, { recursive: true, force: true });
      console.log('  Removed .aver/');
      cleaned++;
    }

    if (await exists(omnysysPath)) {
      await fs.rm(omnysysPath, { recursive: true, force: true });
      console.log('  Removed omnysysdata/');
      cleaned++;
    }

    if (cleaned === 0) {
      console.log('  No analysis data found');
    }

    console.log('\nCleanup complete!\n');
    process.exit(0);
  } catch (error) {
    console.error('\nCleanup failed:');
    console.error(`   ${error.message}\n`);
    process.exit(1);
  }
}
