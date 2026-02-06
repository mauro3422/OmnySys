import { indexProject } from '../../layer-a-static/indexer.js';
import { resolveProjectPath } from '../utils/paths.js';
import { showHelp } from '../help.js';

export async function analyze(projectPath, options = {}) {
  const absolutePath = resolveProjectPath(projectPath);
  const {
    singleFile = null,
    verbose = true,
    exitOnComplete = true,
    showHelpOnError = true
  } = options;

  console.log('\nOmniSystem Analysis\n');
  console.log(`Project: ${absolutePath}\n`);

  if (singleFile) {
    console.log(`Single file mode: ${singleFile}\n`);
  }

  try {
    await indexProject(absolutePath, { verbose, singleFile });

    console.log('\nAnalysis complete!\n');
    console.log('Next steps:');
    console.log('  omnysystem status <project>  # Check analysis status');
    console.log('  omnysystem serve <project>   # Start MCP server');
    console.log('');

    if (exitOnComplete) {
      process.exit(0);
    }
    return;
  } catch (error) {
    console.error('\nAnalysis failed:');
    console.error(`   ${error.message}\n`);
    if (showHelpOnError) {
      showHelp();
    }
    if (exitOnComplete) {
      process.exit(1);
    }
    throw error;
  }
}
