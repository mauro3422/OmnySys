import { getProjectStats } from '../../layer-a-static/query/index.js';
import { hasExistingAnalysis } from '../../layer-a-static/storage/storage-manager.js';
import { resolveProjectPath } from '../utils/paths.js';

export async function status(projectPath) {
  const absolutePath = resolveProjectPath(projectPath);

  console.log('\nOmniSystem Status\n');
  console.log(`Project: ${absolutePath}\n`);

  try {
    const hasAnalysis = await hasExistingAnalysis(absolutePath);

    if (!hasAnalysis) {
      console.log('No analysis data found\n');
      console.log('Run: omnysystem analyze <project>\n');
      process.exit(0);
    }

    const stats = await getProjectStats(absolutePath);

    console.log('Analysis data found\n');
    console.log('Statistics:');
    console.log(`  - Files analyzed: ${stats.totalFiles}`);
    console.log(`  - Total functions: ${stats.totalFunctions}`);
    console.log(`  - Dependencies: ${stats.totalDependencies}`);
    console.log(`  - Semantic connections: ${stats.totalSemanticConnections}`);
    console.log(`    - Shared state: ${stats.sharedStateConnections}`);
    console.log(`    - Event listeners: ${stats.eventListenerConnections}`);
    console.log('  - Risk assessment:');
    console.log(`    - High-risk files: ${stats.highRiskFiles}`);
    console.log(`    - Medium-risk files: ${stats.mediumRiskFiles}`);
    console.log(`    - Average risk score: ${stats.averageRiskScore}/10`);
    console.log(`\nAnalyzed at: ${stats.analyzedAt}\n`);

    console.log('Next: omnysystem serve <project>\n');
    process.exit(0);
  } catch (error) {
    console.error('\nError reading analysis:');
    console.error(`   ${error.message}\n`);
    process.exit(1);
  }
}
