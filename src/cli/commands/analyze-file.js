import path from 'path';
import { analyzeLogic } from './analyze.js';
import { hasExistingAnalysis } from '#layer-c/storage/setup/index.js';
import { indexProject } from '../../layer-a-static/indexer.js';
import { exists } from '../utils/paths.js';

export async function analyzeFileLogic(filePath, options = {}) {
  const { silent = false } = options;

  if (!filePath) {
    if (!silent) {
      console.error('\nError: No file specified!');
      console.error('\nUsage:');
      console.error('   omnysystem analyze-file <path/to/file.js>\n');
    }
    return { success: false, error: 'No file specified', exitCode: 1 };
  }

  const absoluteFilePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);

  let projectPath = path.dirname(absoluteFilePath);
  let foundRoot = false;

  while (projectPath !== path.dirname(projectPath)) {
    const hasPackage = await exists(path.join(projectPath, 'package.json'));
    const hasGit = await exists(path.join(projectPath, '.git'));
    if (hasPackage || hasGit) {
      foundRoot = true;
      break;
    }
    projectPath = path.dirname(projectPath);
  }

  if (!foundRoot) {
    if (!silent) console.warn('Warning: Could not find project root, using file directory');
    projectPath = path.dirname(absoluteFilePath);
  }

  const relativeFilePath = path.relative(projectPath, absoluteFilePath).replace(/\\/g, '/');

  if (!silent) {
    console.log('\nOmniSystem Single-File Analysis\n');
    console.log(`Project: ${projectPath}`);
    console.log(`File: ${relativeFilePath}\n`);
  }

  const hasAnalysis = await hasExistingAnalysis(projectPath);
  if (!hasAnalysis) {
    if (!silent) {
      console.log('Info: No existing project analysis found.');
      console.log('Running full project analysis first...\n');
    }
    const result = await analyzeLogic(projectPath, { singleFile: relativeFilePath, silent });
    return result;
  }

  if (!silent) console.log('Using existing project context\n');

  try {
    await indexProject(projectPath, {
      verbose: !silent,
      singleFile: relativeFilePath,
      incremental: true
    });

    if (!silent) {
      console.log('\nFile analysis complete!\n');
      console.log(`Results saved to: .omnysysdata/files/${relativeFilePath}.json\n`);
    }

    return { success: true, exitCode: 0, projectPath, relativeFilePath };
  } catch (error) {
    if (!silent) {
      console.error('\nAnalysis failed:');
      console.error(`   ${error.message}\n`);
    }
    return { success: false, error: error.message, exitCode: 1 };
  }
}

export async function analyzeFile(filePath) {
  const result = await analyzeFileLogic(filePath);
  process.exit(result.exitCode);
}
