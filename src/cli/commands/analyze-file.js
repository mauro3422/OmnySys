import path from 'path';
import { analyze } from './analyze.js';
import { hasExistingAnalysis } from '../../layer-a-static/storage/storage-manager.js';
import { indexProject } from '../../layer-a-static/indexer.js';
import { exists } from '../utils/paths.js';

export async function analyzeFile(filePath) {
  if (!filePath) {
    console.error('\nError: No file specified!');
    console.error('\nUsage:');
    console.error('   omnysystem analyze-file <path/to/file.js>\n');
    process.exit(1);
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
    console.warn('Warning: Could not find project root, using file directory');
    projectPath = path.dirname(absoluteFilePath);
  }

  const relativeFilePath = path.relative(projectPath, absoluteFilePath).replace(/\\/g, '/');

  console.log('\nOmniSystem Single-File Analysis\n');
  console.log(`Project: ${projectPath}`);
  console.log(`File: ${relativeFilePath}\n`);

  const hasAnalysis = await hasExistingAnalysis(projectPath);
  if (!hasAnalysis) {
    console.log('Info: No existing project analysis found.');
    console.log('Running full project analysis first...\n');
    await analyze(projectPath, { singleFile: relativeFilePath });
    return;
  }

  console.log('Using existing project context\n');

  try {
    await indexProject(projectPath, {
      verbose: true,
      singleFile: relativeFilePath,
      incremental: true
    });

    console.log('\nFile analysis complete!\n');
    console.log(`Results saved to: .OmnySystemData/files/${relativeFilePath}.json\n`);

    process.exit(0);
  } catch (error) {
    console.error('\nAnalysis failed:');
    console.error(`   ${error.message}\n`);
    process.exit(1);
  }
}
