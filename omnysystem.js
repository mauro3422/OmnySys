#!/usr/bin/env node

/**
 * OmniSystem - Unified CLI for CogniSystem Analysis
 *
 * Local-only intelligent codebase analysis without internet connectivity.
 * All data stays on your machine.
 *
 * Usage:
 *   omnysystem <command> [project]
 *
 * Commands:
 *   analyze [project]    Run static analysis
 *   serve [project]      Start MCP server
 *   clean [project]      Clean analysis data
 *   status [project]     Show analysis status
 *   export [project]     Export system map
 *   help                 Show help
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { indexProject } from './src/layer-a-static/indexer.js';
import { CogniSystemMCPServer } from './src/layer-c-memory/mcp-server.js';
import { getProjectStats, exportFullSystemMapToFile } from './src/layer-a-static/storage/query-service.js';
import { hasExistingAnalysis } from './src/layer-a-static/storage/storage-manager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================
// Utilities
// ============================================================

/**
 * Check if a path exists
 */
async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve project path to absolute
 */
function resolveProjectPath(projectPath) {
  if (!projectPath) projectPath = process.cwd();
  return path.isAbsolute(projectPath)
    ? projectPath
    : path.resolve(process.cwd(), projectPath);
}

/**
 * Display help/usage message
 */
function showHelp() {
  console.log(`
🧠 OmniSystem - Intelligent Codebase Analysis

USAGE:
  omnysystem <command> [project]

COMMANDS:
  analyze [project]    Run static analysis (generates .aver/ + omnysysdata/)
  serve [project]      Start local MCP server for Claude Code
  clean [project]      Remove analysis data (.aver/ + omnysysdata/)
  status [project]     Show analysis status and statistics
  export [project]     Export complete system map (debug)
  help                 Show this message

ARGUMENTS:
  [project]            Path to project (default: current directory)

EXAMPLES:
  omnysystem analyze /my-project
  omnysystem serve .
  omnysystem status ../another-project
  omnysystem clean

💡 All data stays local - no internet connection required
  `);
}

// ============================================================
// Commands
// ============================================================

/**
 * ANALYZE - Run static analysis and generate .aver/ + omnysysdata/
 */
async function analyze(projectPath) {
  const absolutePath = resolveProjectPath(projectPath);

  console.log('\n🚀 OmniSystem Analysis\n');
  console.log(`📁 Project: ${absolutePath}\n`);

  try {
    await indexProject(absolutePath, { verbose: true });

    console.log('\n✅ Analysis complete!\n');
    console.log('📍 Next steps:');
    console.log('  omnysystem status <project>  # Check analysis status');
    console.log('  omnysystem serve <project>   # Start MCP server');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Analysis failed:');
    console.error(`   ${error.message}\n`);
    showHelp();
    process.exit(1);
  }
}

/**
 * SERVE - Start MCP server
 */
async function serve(projectPath) {
  const absolutePath = resolveProjectPath(projectPath);

  console.log('\n🚀 OmniSystem MCP Server\n');
  console.log(`📁 Project: ${absolutePath}\n`);

  try {
    // Check if analysis exists
    const hasAnalysis = await hasExistingAnalysis(absolutePath);
    if (!hasAnalysis) {
      console.error('❌ No analysis data found!');
      console.error('\n💡 Run first:');
      console.error('   omnysystem analyze <project>\n');
      process.exit(1);
    }

    // Initialize and start server
    const server = new CogniSystemMCPServer(absolutePath);
    await server.initialize();

    console.log('\n💡 Server running. Press Ctrl+C to stop.\n');

    // Keep server alive
    await new Promise(() => {});
  } catch (error) {
    console.error('\n❌ Server failed to start:');
    console.error(`   ${error.message}\n`);
    process.exit(1);
  }
}

/**
 * STATUS - Show analysis status and statistics
 */
async function status(projectPath) {
  const absolutePath = resolveProjectPath(projectPath);

  console.log('\n📊 OmniSystem Status\n');
  console.log(`📁 Project: ${absolutePath}\n`);

  try {
    const hasAnalysis = await hasExistingAnalysis(absolutePath);

    if (!hasAnalysis) {
      console.log('  ❌ No analysis data found\n');
      console.log('💡 Run: omnysystem analyze <project>\n');
      process.exit(0);
    }

    const stats = await getProjectStats(absolutePath);

    console.log('✅ Analysis data found\n');
    console.log('📊 Statistics:');
    console.log(`  - Files analyzed: ${stats.totalFiles}`);
    console.log(`  - Total functions: ${stats.totalFunctions}`);
    console.log(`  - Dependencies: ${stats.totalDependencies}`);
    console.log(`  - Semantic connections: ${stats.totalSemanticConnections}`);
    console.log(`    • Shared state: ${stats.sharedStateConnections}`);
    console.log(`    • Event listeners: ${stats.eventListenerConnections}`);
    console.log(`  - Risk assessment:`);
    console.log(`    • High-risk files: ${stats.highRiskFiles}`);
    console.log(`    • Medium-risk files: ${stats.mediumRiskFiles}`);
    console.log(`    • Average risk score: ${stats.averageRiskScore}/10`);
    console.log(`\n📅 Analyzed at: ${stats.analyzedAt}\n`);

    console.log('💡 Next: omnysystem serve <project>\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error reading analysis:');
    console.error(`   ${error.message}\n`);
    process.exit(1);
  }
}

/**
 * CLEAN - Remove analysis data
 */
async function clean(projectPath) {
  const absolutePath = resolveProjectPath(projectPath);

  console.log('\n🧹 Cleaning OmniSystem data\n');
  console.log(`📁 Project: ${absolutePath}\n`);

  try {
    const averPath = path.join(absolutePath, '.aver');
    const omnysysPath = path.join(absolutePath, 'omnysysdata');

    let cleaned = 0;

    // Remove .aver/
    if (await exists(averPath)) {
      await fs.rm(averPath, { recursive: true, force: true });
      console.log('  ✓ Removed .aver/');
      cleaned++;
    }

    // Remove omnysysdata/
    if (await exists(omnysysPath)) {
      await fs.rm(omnysysPath, { recursive: true, force: true });
      console.log('  ✓ Removed omnysysdata/');
      cleaned++;
    }

    if (cleaned === 0) {
      console.log('  ℹ️  No analysis data found');
    }

    console.log('\n✅ Cleanup complete!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Cleanup failed:');
    console.error(`   ${error.message}\n`);
    process.exit(1);
  }
}

/**
 * EXPORT - Export system map (debug)
 */
async function exportMap(projectPath) {
  const absolutePath = resolveProjectPath(projectPath);

  console.log('\n📦 Exporting System Map\n');
  console.log(`📁 Project: ${absolutePath}\n`);

  try {
    const hasAnalysis = await hasExistingAnalysis(absolutePath);
    if (!hasAnalysis) {
      console.error('❌ No analysis data found!');
      console.error('\n💡 Run first:');
      console.error('   omnysystem analyze <project>\n');
      process.exit(1);
    }

    const result = await exportFullSystemMapToFile(absolutePath);

    if (result.success) {
      console.log(`✅ Export successful!\n`);
      console.log(`📄 File: ${path.basename(result.filePath)}`);
      console.log(`💾 Size: ${result.sizeKB} KB`);
      console.log(`📊 Files: ${result.filesExported}\n`);
    } else {
      throw new Error('Export failed (unknown reason)');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Export failed:');
    console.error(`   ${error.message}\n`);
    process.exit(1);
  }
}

// ============================================================
// Main Entry Point
// ============================================================

async function main() {
  const command = process.argv[2] || 'help';
  const projectPath = process.argv[3];

  switch (command) {
    case 'analyze':
      await analyze(projectPath);
      break;

    case 'serve':
      await serve(projectPath);
      break;

    case 'clean':
      await clean(projectPath);
      break;

    case 'status':
      await status(projectPath);
      break;

    case 'export':
      await exportMap(projectPath);
      break;

    case 'help':
    case '--help':
    case '-h':
      showHelp();
      process.exit(0);
      break;

    default:
      console.error(`\n❌ Unknown command: ${command}\n`);
      showHelp();
      process.exit(1);
  }
}

// Execute if run directly
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  main().catch((error) => {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  });
}

export { analyze, serve, clean, status, exportMap };
