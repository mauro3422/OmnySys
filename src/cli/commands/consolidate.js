import fs from 'fs/promises';
import path from 'path';
import { Orchestrator } from '../../core/orchestrator.js';
import { hasExistingAnalysis } from '../../layer-a-static/storage/storage-manager.js';
import { resolveProjectPath } from '../utils/paths.js';
import { getEnhancedMapPath, getIssuesPath } from '#config/paths.js';

export async function consolidate(projectPath) {
  const absolutePath = resolveProjectPath(projectPath);

  console.log('\nOmniSystem Iterative Consolidation (Orchestrator)\n');
  console.log(`Project: ${absolutePath}\n`);

  try {
    const hasAnalysis = await hasExistingAnalysis(absolutePath);
    if (!hasAnalysis) {
      console.error('No analysis data found!');
      console.error('\nRun first:');
      console.error('   omnysystem analyze <project>\n');
      process.exit(1);
    }

    console.log('Initializing Orchestrator...\n');
    const orchestrator = new Orchestrator(absolutePath, {
      enableFileWatcher: false,
      enableWebSocket: false,
      autoStartLLM: true
    });

    let finalStats = null;
    orchestrator.on('analysis:complete', (stats) => {
      finalStats = stats;
    });

    await new Promise((resolve, reject) => {
      orchestrator.initialize();

      orchestrator.on('indexing:completed', () => {
        console.log('\nLayer A (Static Analysis) completed');
        console.log('Starting Layer B (LLM Analysis)...\n');
      });

      orchestrator.on('analysis:complete', () => {
        console.log('\nAnalysis complete!');
        resolve();
      });

      orchestrator.on('error', (error) => {
        reject(error);
      });

      setTimeout(() => {
        reject(new Error('Analysis timeout after 30 minutes'));
      }, 30 * 60 * 1000);
    });

    const enhancedCandidates = [
      getEnhancedMapPath(absolutePath),
      path.join(absolutePath, 'system-map-enhanced.json')
    ];
    let enhancedMap = null;
    for (const candidate of enhancedCandidates) {
      try {
        const content = await fs.readFile(candidate, 'utf-8');
        enhancedMap = JSON.parse(content);
        break;
      } catch {
        // Try next candidate
      }
    }
    if (!enhancedMap) {
      enhancedMap = { metadata: { totalFiles: finalStats?.totalFiles || 0 } };
    }

    const issuesPath = getIssuesPath(absolutePath);
    let issuesReport = { stats: { totalIssues: 0 } };
    try {
      issuesReport = JSON.parse(await fs.readFile(issuesPath, 'utf-8'));
    } catch {
      // No issues file
    }

    console.log('\nConsolidation complete!\n');
    console.log('Results:');
    console.log(`  - Iterations: ${finalStats?.iterations || 1}`);
    console.log(`  - Files analyzed: ${finalStats?.totalFiles || enhancedMap.metadata.totalFiles}`);
    console.log(`  - Issues found: ${issuesReport.stats?.totalIssues || 0}`);
    if (issuesReport.stats?.totalIssues > 0) {
      console.log(`    - High severity: ${issuesReport.stats.bySeverity?.high || 0}`);
      console.log(`    - Medium severity: ${issuesReport.stats.bySeverity?.medium || 0}`);
      console.log(`    - Low severity: ${issuesReport.stats.bySeverity?.low || 0}`);
    }
    console.log('\nView detailed analysis:');
    console.log(`   ${getIssuesPath('.')}\n`);

    process.exit(0);
  } catch (error) {
    console.error('\nConsolidation failed:');
    console.error(`   ${error.message}\n`);
    console.error(error.stack);
    process.exit(1);
  }
}
