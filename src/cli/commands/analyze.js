import { indexProject } from '#layer-a/indexer.js';
import { resolveProjectPath } from '../utils/paths.js';
import { showHelp } from '../help.js';

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

export async function analyze(projectPath, options = {}) {
  const result = await analyzeLogic(projectPath, { ...options, exitOnComplete: false });
  if (options.exitOnComplete !== false) {
    process.exit(result.exitCode);
    return;
  }
  if (!result.success) {
    throw new Error(result.error);
  }
  return result;
}
