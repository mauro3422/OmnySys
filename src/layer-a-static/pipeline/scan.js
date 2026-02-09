import path from 'path';
import { scanProject, detectProjectInfo } from '../scanner.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:scan');



export async function loadProjectInfo(absoluteRootPath, verbose = true) {
  if (verbose) logger.info('ðŸ“‹ Detecting project info...');
  const projectInfo = await detectProjectInfo(absoluteRootPath);
  if (verbose) logger.info(`  âœ“ TypeScript: ${projectInfo.useTypeScript}\n`);
  return projectInfo;
}

export async function scanProjectFiles(absoluteRootPath, verbose = true) {
  if (verbose) logger.info('ðŸ” Scanning files...');
  const relativeFiles = await scanProject(absoluteRootPath, { returnAbsolute: false });
  const files = relativeFiles.map((f) => path.join(absoluteRootPath, f));
  if (verbose) logger.info(`  âœ“ Found ${files.length} files\n`);
  return { relativeFiles, files };
}
