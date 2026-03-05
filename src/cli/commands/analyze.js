import { indexProject } from '#layer-a/indexer.js';
import { resolveProjectPath } from '../utils/paths.js';
import { log, showHelp } from '../utils/logger.js';

export const aliases = ['analyze', 'index'];

export async function analyzeLogic(projectPath, options = {}) {
  const absolutePath = resolveProjectPath(projectPath);
  const {
    singleFile = null,
    verbose = true,
    showHelpOnError = true,
    silent = false
  } = options;

  if (!silent) {
    console.log('\nOmniSystem Analysis\n');
    console.log(`Project: ${absolutePath}\n`);

    if (singleFile) {
      console.log(`Single file mode: ${singleFile}\n`);
    }
  }

  try {
    await indexProject(absolutePath, { verbose: verbose && !silent, singleFile });

    if (!silent) {
      console.log('\nAnalysis complete!\n');
      console.log('Next steps:');
      console.log('  omnysystem status <project>  # Check analysis status');
      console.log('  omnysystem serve <project>   # Start MCP server');
      console.log('');
    }

    return { success: true, exitCode: 0, projectPath: absolutePath };
  } catch (error) {
    if (!silent) {
      console.error('\nAnalysis failed:');
      console.error(`   ${error.message}\n`);
      if (showHelpOnError) {
        showHelp();
      }
    }
    return { success: false, exitCode: 1, error: error.message };
  }
}

export async function execute(projectPath) {
  const absolutePath = resolveProjectPath(projectPath);
  log(`Starting analysis for: ${absolutePath}`, 'loading');

  const result = await analyzeLogic(absolutePath, { verbose: true });

  if (result.success) {
    log('Analysis complete!', 'success');
  } else {
    log(`Analysis failed: ${result.error}`, 'error');
  }
}
