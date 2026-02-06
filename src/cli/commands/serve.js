import fs from 'fs/promises';
import path from 'path';
import { CogniSystemMCPServer } from '../../layer-c-memory/mcp-server.js';
import { CogniSystemUnifiedServer } from '../../core/unified-server.js';
import { Orchestrator } from '../../core/orchestrator.js';
import { loadAIConfig } from '../../ai/llm-client.js';
import { hasExistingAnalysis } from '../../layer-a-static/storage/storage-manager.js';
import { resolveProjectPath } from '../utils/paths.js';
import { ensureLLMAvailable } from '../utils/llm.js';
import { analyze } from './analyze.js';

export async function serve(projectPath, options = {}) {
  const absolutePath = resolveProjectPath(projectPath);
  const { unified = true } = options;

  if (unified) {
    const server = new CogniSystemUnifiedServer(absolutePath);

    process.on('SIGTERM', () => server.shutdown());
    process.on('SIGINT', () => server.shutdown());

    try {
      await server.initialize();
      await new Promise(() => {});
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
    return;
  }

  console.log('\nOmniSystem MCP Server - Auto Mode (Legacy)\n');
  console.log(`Project: ${absolutePath}\n`);

  try {
    console.log('Step 1/4: Checking static analysis...');
    const hasAnalysis = await hasExistingAnalysis(absolutePath);

    if (!hasAnalysis) {
      console.log('  Warning: No analysis found - running static analysis...\n');
      await analyze(absolutePath, { exitOnComplete: false, showHelpOnError: false });
      console.log('\n  Static analysis complete\n');
    } else {
      console.log('  Static analysis exists\n');
    }

    console.log('Step 2/4: Checking AI server...');
    const aiConfig = await loadAIConfig();
    const llmStatus = await ensureLLMAvailable(aiConfig, {
      required: true,
      autoStart: true,
      maxWaitSeconds: 60
    });

    if (llmStatus.started) {
      console.log('  AI server was auto-started');
    }
    console.log('  AI server running\n');

    console.log('Step 3/4: Running AI consolidation (Orchestrator)...\n');

    const orchestrator = new Orchestrator(absolutePath, {
      enableFileWatcher: false,
      enableWebSocket: false,
      autoStartLLM: false
    });

    let finalStats = null;
    orchestrator.on('analysis:complete', (stats) => {
      finalStats = stats;
    });

    await new Promise((resolve, reject) => {
      orchestrator.initialize();

      orchestrator.on('analysis:complete', () => {
        console.log('\n  Consolidation complete');
        resolve();
      });

      orchestrator.on('error', (error) => {
        reject(error);
      });

      setTimeout(() => {
        reject(new Error('Consolidation timeout after 30 minutes'));
      }, 30 * 60 * 1000);
    });

    const enhancedMapPath = path.join(absolutePath, 'system-map-enhanced.json');
    const enhancedMap = JSON.parse(await fs.readFile(enhancedMapPath, 'utf-8'));

    const issuesPath = path.join(absolutePath, '.OmnySysData', 'semantic-issues.json');
    let issuesReport = { stats: { totalIssues: 0 } };
    try {
      issuesReport = JSON.parse(await fs.readFile(issuesPath, 'utf-8'));
    } catch {
      // No issues file
    }

    console.log(`    - Iterations: ${finalStats?.iterations || 1}`);
    console.log(`    - Files analyzed: ${finalStats?.totalFiles || enhancedMap.metadata.totalFiles}`);
    console.log(`    - Issues found: ${issuesReport.stats?.totalIssues || 0}\n`);

    console.log('Step 4/4: Starting MCP server...\n');
    const server = new CogniSystemMCPServer(absolutePath);
    await server.initialize();

    console.log('================================================================');
    console.log('OmniSystem MCP Server Running');
    console.log('================================================================\n');

    await new Promise(() => {});
  } catch (error) {
    console.error('\nServer failed to start:');
    console.error(`   ${error.message}\n`);
    console.error(error.stack);
    process.exit(1);
  }
}
