import path from 'path';
import { scanProject, detectProjectInfo } from '../scanner.js';

export async function loadProjectInfo(absoluteRootPath, verbose = true) {
  if (verbose) console.log('ðŸ“‹ Detecting project info...');
  const projectInfo = await detectProjectInfo(absoluteRootPath);
  if (verbose) console.log(`  âœ“ TypeScript: ${projectInfo.useTypeScript}\n`);
  return projectInfo;
}

export async function scanProjectFiles(absoluteRootPath, verbose = true) {
  if (verbose) console.log('ðŸ” Scanning files...');
  const relativeFiles = await scanProject(absoluteRootPath, { returnAbsolute: false });
  const files = relativeFiles.map((f) => path.join(absoluteRootPath, f));
  if (verbose) console.log(`  âœ“ Found ${files.length} files\n`);
  return { relativeFiles, files };
}
