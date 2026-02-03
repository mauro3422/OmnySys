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
 *   analyze [project]    Run static analysis (full project)
 *   analyze-file <file>  Analyze single file (fast mode)
 *   serve [project]      Start MCP server
 *   clean [project]      Clean analysis data
 *   status [project]     Show analysis status
 *   export [project]     Export system map
 *   help                 Show help
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { indexProject } from './src/layer-a-static/indexer.js';
import { CogniSystemMCPServer } from './src/layer-c-memory/mcp-server.js';
import { CogniSystemUnifiedServer } from './src/core/unified-server.js';
import { getProjectStats, exportFullSystemMapToFile } from './src/layer-a-static/storage/query-service.js';
import { hasExistingAnalysis } from './src/layer-a-static/storage/storage-manager.js';
import { LLMClient, loadAIConfig } from './src/ai/llm-client.js';
import { enrichSemanticAnalysis, generateIssuesReport } from './src/layer-b-semantic/semantic-enricher.js';
import { savePartitionedSystemMap } from './src/layer-a-static/storage/storage-manager.js';
import { analyzeProjectStructure, generateStructureReport } from './src/layer-b-semantic/project-structure-analyzer.js';

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
 * Check if brain server is already starting (prevents double spawn)
 */
async function isBrainServerStarting() {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    // Check if there's already a cmd.exe running the start_brain_gpu.bat
    const { stdout } = await execAsync('wmic process where "name=\'cmd.exe\'" get commandline /format:csv 2>nul');
    
    const gpuBatches = stdout.toLowerCase().split('\n').filter(line => 
      line.includes('start_brain_gpu') && !line.includes('wmic')
    );
    
    // If there's more than one cmd running the batch, something is starting
    return gpuBatches.length > 0;
  } catch {
    return false;
  }
}

/**
 * Check if port is already in use (server might be starting)
 */
async function isPortInUse(port) {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    const { stdout } = await execAsync(`netstat -an | findstr ":${port} " | findstr "LISTENING"`);
    return stdout.includes(port.toString());
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
  omnysystem ai <subcommand> [mode]

COMMANDS:
  analyze [project]    Run static analysis (generates .OmnySystemData/)
  check <file>         Show impact analysis for a specific file
  consolidate [project] Iterative AI consolidation to 100% coverage
  serve [project]      Start local MCP server for Claude Code
  clean [project]      Remove analysis data (.OmnySystemData/)
  status [project]     Show analysis status and statistics
  export [project]     Export complete system map (debug)
  ai <subcommand>      Manage AI servers (see below)
  help                 Show this message

AI SUBCOMMANDS:
  ai start [mode]      Start AI server(s) - modes: gpu (default), cpu, both
  ai stop              Stop all AI servers
  ai status            Check AI server status

ARGUMENTS:
  [project]            Path to project (default: current directory)

EXAMPLES:
  omnysystem analyze /my-project
  omnysystem serve .
  omnysystem status ../another-project
  omnysystem clean
  omnysystem ai start gpu
  omnysystem ai status

💡 All data stays local - no internet connection required
  `);
}

// ============================================================
// Commands
// ============================================================

/**
 * ANALYZE - Run static analysis and generate .OmnySystemData/
 */
async function analyze(projectPath, options = {}) {
  const absolutePath = resolveProjectPath(projectPath);
  const { singleFile = null, verbose = true } = options;

  console.log('\n🚀 OmniSystem Analysis\n');
  console.log(`📁 Project: ${absolutePath}\n`);
  
  if (singleFile) {
    console.log(`📄 Single file mode: ${singleFile}\n`);
  }

  try {
    await indexProject(absolutePath, { verbose, singleFile });

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
 * ANALYZE-FILE - Quick analysis of a single file
 * Loads existing project context and analyzes only the specified file
 */
async function analyzeFile(filePath) {
  if (!filePath) {
    console.error('\n❌ No file specified!');
    console.error('\n💡 Usage:');
    console.error('   omnysystem analyze-file <path/to/file.js>\n');
    process.exit(1);
  }

  // Resolve file path
  const absoluteFilePath = path.isAbsolute(filePath) 
    ? filePath 
    : path.resolve(process.cwd(), filePath);
  
  // Find project root (looking for package.json or .git)
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
    console.warn('⚠️  Could not find project root, using file directory');
    projectPath = path.dirname(absoluteFilePath);
  }

  // Get relative path from project root
  const relativeFilePath = path.relative(projectPath, absoluteFilePath).replace(/\\/g, '/');

  console.log('\n🚀 OmniSystem Single-File Analysis\n');
  console.log(`📁 Project: ${projectPath}`);
  console.log(`📄 File: ${relativeFilePath}\n`);

  // Check if project has existing analysis
  const hasAnalysis = await hasExistingAnalysis(projectPath);
  if (!hasAnalysis) {
    console.log('ℹ️  No existing project analysis found.');
    console.log('   Running full project analysis first...\n');
    // Fall back to full analysis
    await analyze(projectPath, { singleFile: relativeFilePath });
    return;
  }

  console.log('✓ Using existing project context\n');
  
  // Run analysis with single-file mode
  try {
    await indexProject(projectPath, { 
      verbose: true, 
      singleFile: relativeFilePath,
      incremental: true 
    });

    console.log('\n✅ File analysis complete!\n');
    console.log(`📊 Results saved to: .OmnySystemData/files/${relativeFilePath}.json\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Analysis failed:');
    console.error(`   ${error.message}\n`);
    process.exit(1);
  }
}

/**
 * CONSOLIDATE - Iterative AI consolidation to 100% coverage
 */
async function consolidate(projectPath) {
  const absolutePath = resolveProjectPath(projectPath);

  console.log('\n🔄 OmniSystem Iterative Consolidation\n');
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

    // Check if AI servers are running
    console.log('🔍 Checking AI server status...');
    const aiConfig = await loadAIConfig();
    const client = new LLMClient(aiConfig);
    const health = await client.healthCheck();

    if (!health.gpu && !health.cpu) {
      console.error('\n❌ No AI servers available!');
      console.error('\n💡 Start AI server first:');
      console.error('   src/ai/scripts/start_brain_gpu.bat\n');
      console.error('Or run:');
      console.error('   omnysystem ai start gpu\n');
      process.exit(1);
    }

    console.log('✓ AI server available\n');

    // Load existing analysis
    console.log('📖 Loading existing analysis...');
    const enhancedMapPath = path.join(absolutePath, 'system-map-enhanced.json');
    const enhancedMap = JSON.parse(await fs.readFile(enhancedMapPath, 'utf-8'));

    // Load file source code
    console.log('📖 Loading source files...');
    const fileSourceCode = {};
    for (const [filePath, analysis] of Object.entries(enhancedMap.files || {})) {
      const absoluteFilePath = path.join(absolutePath, filePath);
      try {
        fileSourceCode[filePath] = await fs.readFile(absoluteFilePath, 'utf-8');
      } catch (error) {
        console.warn(`⚠️  Could not read ${filePath}: ${error.message}`);
      }
    }

    console.log(`✓ Loaded ${Object.keys(fileSourceCode).length} files\n`);

    // Analyze project structure (subsystems detection)
    console.log('🔍 Analyzing project structure...\n');
    const projectStructure = analyzeProjectStructure(enhancedMap);

    console.log(generateStructureReport(projectStructure));

    // Run iterative enrichment with project structure context
    console.log('\n🤖 Starting iterative AI consolidation...\n');
    const enrichmentResult = await enrichSemanticAnalysis(
      enhancedMap,
      fileSourceCode,
      aiConfig,
      { projectStructure }, // Pass structure context
      {
        iterative: true,
        maxIterations: Infinity // No limit - iterate until convergence
      }
    );

    // Save consolidated results
    console.log('\n💾 Saving consolidated results...');

    // Update enhanced map
    const consolidatedMap = {
      ...enhancedMap,
      files: enrichmentResult.results.files,
      semanticIssues: enrichmentResult.issues,
      metadata: {
        ...enhancedMap.metadata,
        consolidatedAt: new Date().toISOString(),
        iterations: enrichmentResult.iterations,
        includes: [...new Set([...(enhancedMap.metadata.includes || []), 'ai-consolidated'])]
      }
    };

    await fs.writeFile(
      enhancedMapPath,
      JSON.stringify(consolidatedMap, null, 2),
      'utf-8'
    );
    console.log('  ✓ Updated system-map-enhanced.json');

    // Update partitioned storage
    await savePartitionedSystemMap(absolutePath, consolidatedMap);
    console.log('  ✓ Updated .OmnySystemData/ directory');

    // Save issues report if exists
    if (enrichmentResult.issues?.stats?.totalIssues > 0) {
      const issuesReportText = generateIssuesReport(enrichmentResult.issues);
      const issuesReportPath = path.join(absolutePath, '.OmnySystemData', 'semantic-issues-report.txt');
      await fs.writeFile(issuesReportPath, issuesReportText, 'utf-8');
      console.log('  ✓ Generated semantic-issues-report.txt');
    }

    console.log('\n✅ Consolidation complete!\n');
    console.log('📊 Results:');
    console.log(`  - Iterations: ${enrichmentResult.iterations}`);
    console.log(`  - Files enhanced: ${enrichmentResult.enhancedCount}`);
    console.log(`  - Issues found: ${enrichmentResult.issues?.stats?.totalIssues || 0}`);
    console.log(`    • High severity: ${enrichmentResult.issues?.stats?.bySeverity?.high || 0}`);
    console.log(`    • Medium severity: ${enrichmentResult.issues?.stats?.bySeverity?.medium || 0}`);
    console.log(`    • Low severity: ${enrichmentResult.issues?.stats?.bySeverity?.low || 0}`);
    console.log('\n💡 View detailed issues:');
    console.log(`   cat ${path.join('.OmnySystemData', 'semantic-issues-report.txt')}\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Consolidation failed:');
    console.error(`   ${error.message}\n`);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * SERVE - Start MCP server with full auto-initialization
 *
 * Auto-executes complete pipeline:
 * 1. Static analysis (if needed)
 * 2. LLM server startup (if needed)
 * 3. Iterative AI consolidation
 * 4. MCP server initialization
 */
async function serve(projectPath, options = {}) {
  const absolutePath = resolveProjectPath(projectPath);
  const { unified = true } = options;

  if (unified) {
    // Use new Unified Server (Orchestrator + MCP + Bridge)
    const server = new CogniSystemUnifiedServer(absolutePath);
    
    process.on('SIGTERM', () => server.shutdown());
    process.on('SIGINT', () => server.shutdown());
    
    try {
      await server.initialize();
      await new Promise(() => {}); // Keep alive
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
    return;
  }

  // Legacy MCP-only mode
  console.log('\n🚀 OmniSystem MCP Server - Auto Mode (Legacy)\n');
  console.log(`📁 Project: ${absolutePath}\n`);

  try {
    // STEP 1: Check if analysis exists, if not, run it
    console.log('📋 Step 1/4: Checking static analysis...');
    const hasAnalysis = await hasExistingAnalysis(absolutePath);

    if (!hasAnalysis) {
      console.log('  ⚠️  No analysis found - running static analysis...\n');
      await analyze(absolutePath);
      console.log('\n  ✓ Static analysis complete\n');
    } else {
      console.log('  ✓ Static analysis exists\n');
    }

    // STEP 2: Check LLM server, start if needed
    console.log('📋 Step 2/4: Checking AI server...');
    const aiConfig = await loadAIConfig();
    const client = new LLMClient(aiConfig);
    let health = await client.healthCheck();

    if (!health.gpu && !health.cpu) {
      // Check if server is already starting to avoid double spawn
      if (await isBrainServerStarting()) {
        console.log('  ⏳ AI server is already starting, waiting...\n');
      } else if (await isPortInUse(8000)) {
        console.log('  ⏳ Port 8000 is in use, server may be starting...\n');
      } else {
        console.log('  ⚠️  AI server not running - starting GPU server...\n');

        // Start LLM server (GPU)
        const llmServerPath = path.join(process.cwd(), 'src', 'ai', 'scripts', 'start_brain_gpu.bat');
        console.log(`  🔧 Starting: ${llmServerPath}`);

        const llmProcess = spawn('cmd.exe', ['/c', llmServerPath], {
          detached: true,
          stdio: 'ignore',
          windowsHide: false
        });
        llmProcess.unref();
      }

      console.log('  ⏳ Waiting for server to be ready...');

      // Wait for server to be healthy (max 60 seconds)
      let attempts = 0;
      const maxAttempts = 60;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        health = await client.healthCheck();

        if (health.gpu || health.cpu) {
          console.log('  ✓ AI server ready\n');
          break;
        }

        attempts++;
        if (attempts % 5 === 0) {
          console.log(`  ⏳ Still waiting... (${attempts}/${maxAttempts}s)`);
        }
      }

      if (!health.gpu && !health.cpu) {
        console.error('  ❌ AI server failed to start after 60 seconds');
        console.error('  💡 Please start manually and try again');
        process.exit(1);
      }
    } else {
      console.log('  ✓ AI server running\n');
    }

    // STEP 3: Run iterative consolidation
    console.log('📋 Step 3/4: Running AI consolidation...\n');

    // Load existing analysis
    const enhancedMapPath = path.join(absolutePath, 'system-map-enhanced.json');
    const enhancedMap = JSON.parse(await fs.readFile(enhancedMapPath, 'utf-8'));

    // Load file source code
    const fileSourceCode = {};
    for (const [filePath] of Object.entries(enhancedMap.files || {})) {
      const absoluteFilePath = path.join(absolutePath, filePath);
      try {
        fileSourceCode[filePath] = await fs.readFile(absoluteFilePath, 'utf-8');
      } catch (error) {
        // Skip files that can't be read
      }
    }

    // Analyze project structure
    const projectStructure = analyzeProjectStructure(enhancedMap);
    console.log(generateStructureReport(projectStructure));

    // Run iterative enrichment
    console.log('\n  🤖 Starting iterative consolidation...\n');
    const enrichmentResult = await enrichSemanticAnalysis(
      enhancedMap,
      fileSourceCode,
      aiConfig,
      { projectStructure },
      {
        iterative: true,
        maxIterations: Infinity
      }
    );

    // Save consolidated results
    const consolidatedMap = {
      ...enhancedMap,
      files: enrichmentResult.results.files,
      semanticIssues: enrichmentResult.issues,
      projectStructure,
      metadata: {
        ...enhancedMap.metadata,
        consolidatedAt: new Date().toISOString(),
        iterations: enrichmentResult.iterations,
        includes: [...new Set([...(enhancedMap.metadata.includes || []), 'ai-consolidated'])]
      }
    };

    await fs.writeFile(enhancedMapPath, JSON.stringify(consolidatedMap, null, 2), 'utf-8');
    await savePartitionedSystemMap(absolutePath, consolidatedMap);

    console.log('\n  ✓ Consolidation complete');
    console.log(`    - Iterations: ${enrichmentResult.iterations}`);
    console.log(`    - Files enhanced: ${enrichmentResult.enhancedCount}\n`);

    // STEP 4: Start MCP server
    console.log('📋 Step 4/4: Starting MCP server...\n');
    const server = new CogniSystemMCPServer(absolutePath);
    await server.initialize();

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ OmniSystem MCP Server Running');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('🎯 System Status:');
    console.log(`  ✓ Static Analysis: ${Object.keys(enhancedMap.files || {}).length} files`);
    console.log(`  ✓ AI Consolidation: ${enrichmentResult.iterations} iterations`);
    console.log(`  ✓ Subsystems: ${projectStructure.stats.subsystemCount}`);
    console.log(`  ✓ MCP Server: Active`);
    console.log('');
    console.log('💡 Press Ctrl+C to stop');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Keep server alive
    await new Promise(() => {});
  } catch (error) {
    console.error('\n❌ Server failed to start:');
    console.error(`   ${error.message}\n`);
    console.error(error.stack);
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

/**
 * CHECK - Show impact analysis for a specific file
 */
async function check(filePath) {
  if (!filePath) {
    console.error('\n❌ Error: No file specified!');
    console.error('\n💡 Usage: omnysystem check <file-path>');
    console.error('   Example: omnysystem check src/api.js\n');
    process.exit(1);
  }

  // Resolve file path relative to current directory
  const absoluteFilePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);

  // Get project root (assuming file is in current project)
  const projectPath = process.cwd();

  console.log(`\n🔍 Impact Analysis: ${path.basename(filePath)}\n`);
  console.log(`📁 Project: ${projectPath}`);
  console.log(`📄 File: ${filePath}\n`);

  try {
    // Check if analysis exists
    const hasAnalysis = await hasExistingAnalysis(projectPath);
    if (!hasAnalysis) {
      console.error('❌ No analysis data found!');
      console.error('\n💡 Run first:');
      console.error('   omnysystem analyze .\n');
      process.exit(1);
    }

    // Load system map
    const systemMapPath = path.join(projectPath, 'system-map-enhanced.json');
    const systemMapContent = await fs.readFile(systemMapPath, 'utf-8');
    const systemMap = JSON.parse(systemMapContent);

    // Find file in system map (handle different path formats)
    const normalizedFilePath = filePath.replace(/\\/g, '/');
    let fileData = null;
    let matchedPath = null;

    for (const [key, value] of Object.entries(systemMap.files || {})) {
      const normalizedKey = key.replace(/\\/g, '/');
      if (normalizedKey.endsWith(normalizedFilePath) || normalizedFilePath.endsWith(normalizedKey)) {
        fileData = value;
        matchedPath = key;
        break;
      }
    }

    if (!fileData) {
      console.error(`❌ File not found in analysis: ${filePath}`);
      console.error('\n💡 Available files:');
      const availableFiles = Object.keys(systemMap.files || {}).slice(0, 10);
      for (const f of availableFiles) {
        console.error(`   - ${f}`);
      }
      console.error('   ...\n');
      process.exit(1);
    }

    // Display Impact Analysis
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 1. Basic Info
    console.log('📊 FILE METRICS');
    console.log(`   Functions: ${fileData.functions?.length || 0}`);
    console.log(`   Exports: ${fileData.exports?.length || 0}`);
    console.log(`   Imports: ${fileData.imports?.length || 0}`);
    console.log(`   Risk Score: ${fileData.riskScore?.total || 0}/10 (${fileData.riskScore?.severity || 'low'})`);
    console.log();

    // 2. Dependencies
    console.log('🔗 DEPENDENCIES');
    if (fileData.dependsOn?.length > 0) {
      console.log('   This file imports from:');
      for (const dep of fileData.dependsOn.slice(0, 10)) {
        console.log(`     • ${dep}`);
      }
      if (fileData.dependsOn.length > 10) {
        console.log(`     ... and ${fileData.dependsOn.length - 10} more`);
      }
    } else {
      console.log('   No imports (standalone file)');
    }
    console.log();

    if (fileData.usedBy?.length > 0) {
      console.log('   ⚠️  IMPORTED BY:');
      for (const user of fileData.usedBy.slice(0, 10)) {
        console.log(`     • ${user}`);
      }
      if (fileData.usedBy.length > 10) {
        console.log(`     ... and ${fileData.usedBy.length - 10} more`);
      }
      console.log(`\n   💡 Changing exports will break ${fileData.usedBy.length} file(s)\n`);
    } else {
      console.log('   Not imported by any file\n');
    }

    // 3. Semantic Connections
    const connections = fileData.semanticConnections || [];
    if (connections.length > 0) {
      console.log('🌐 SEMANTIC CONNECTIONS (Hidden Dependencies)');
      
      // Group by type
      const byType = {};
      for (const conn of connections) {
        if (!byType[conn.type]) byType[conn.type] = [];
        byType[conn.type].push(conn);
      }

      for (const [type, conns] of Object.entries(byType)) {
        console.log(`   ${type.toUpperCase()}:`);
        for (const conn of conns.slice(0, 5)) {
          console.log(`     • ${conn.target} ${conn.key ? `(${conn.key})` : ''}`);
        }
        if (conns.length > 5) {
          console.log(`     ... and ${conns.length - 5} more`);
        }
      }
      console.log();
    }

    // 4. Metadata (if available)
    if (fileData.metadata) {
      const md = fileData.metadata;
      
      if (md.jsdocContracts?.all?.length > 0) {
        console.log('📝 JSDoc CONTRACTS');
        console.log(`   Documented functions: ${md.jsdocContracts.all.length}`);
        for (const contract of md.jsdocContracts.all.slice(0, 3)) {
          if (contract.params?.length > 0) {
            const params = contract.params.map(p => `${p.name}: ${p.type}`).join(', ');
            console.log(`     • params: ${params}`);
          }
        }
        console.log();
      }

      if (md.asyncPatterns?.all?.length > 0) {
        console.log('⚡ ASYNC PATTERNS');
        console.log(`   Async functions: ${md.asyncPatterns.asyncFunctions?.length || 0}`);
        console.log(`   Promise chains: ${md.asyncPatterns.promiseChains?.length || 0}`);
        if (md.asyncPatterns.raceConditions?.length > 0) {
          console.log(`   ⚠️  Potential race conditions: ${md.asyncPatterns.raceConditions.length}`);
        }
        console.log();
      }

      if (md.errorHandling?.all?.length > 0) {
        console.log('🚨 ERROR HANDLING');
        console.log(`   Try blocks: ${md.errorHandling.tryBlocks?.length || 0}`);
        console.log(`   Custom errors: ${md.errorHandling.customErrors?.length || 0}`);
        console.log();
      }

      if (md.buildTimeDeps?.devFlags?.length > 0) {
        console.log('🏗️  BUILD-TIME DEPENDENCIES');
        const flags = md.buildTimeDeps.devFlags.map(f => f.name || f.type).join(', ');
        console.log(`   Flags: ${flags}`);
        console.log();
      }
    }

    // 5. Broken Connections
    if (fileData.brokenConnections?.length > 0) {
      console.log('❌ BROKEN CONNECTIONS');
      for (const broken of fileData.brokenConnections.slice(0, 5)) {
        console.log(`   ⚠️  ${broken.type}: ${broken.reason}`);
      }
      console.log();
    }

    // 6. Side Effects
    if (fileData.sideEffects) {
      const se = fileData.sideEffects;
      const hasSideEffects = se.hasGlobalAccess || se.usesLocalStorage || 
                            se.makesNetworkCalls || se.hasEventListeners || 
                            se.accessesWindow;
      
      if (hasSideEffects) {
        console.log('⚠️  SIDE EFFECTS');
        if (se.usesLocalStorage) console.log('   • Uses localStorage/sessionStorage');
        if (se.makesNetworkCalls) console.log('   • Makes network calls');
        if (se.accessesWindow) console.log('   • Accesses window object');
        if (se.hasEventListeners) console.log('   • Adds event listeners');
        if (se.hasGlobalAccess) console.log('   • Accesses global variables');
        console.log();
      }
    }

    // 7. Recommendations
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💡 RECOMMENDATIONS\n');

    if (fileData.riskScore?.severity === 'high' || fileData.riskScore?.severity === 'critical') {
      console.log('   ⚠️  HIGH RISK: This file is complex and widely used.');
      console.log('      Consider splitting into smaller modules.\n');
    }

    if (fileData.usedBy?.length > 5) {
      console.log('   📢 WIDELY USED: Changing this file affects many others.');
      console.log('      Review all dependents before making changes.\n');
    }

    if (connections.length > 0) {
      console.log('   🔗 HIDDEN CONNECTIONS: This file has semantic connections');
      console.log('      that static analysis alone wouldn\'t detect.\n');
    }

    if (!fileData.usedBy || fileData.usedBy.length === 0) {
      console.log('   🗑️  ORPHAN FILE: Not used by any other file.');
      if (!fileData.imports || fileData.imports.length === 0) {
        console.log('      Consider removing if truly dead code.\n');
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Check failed:');
    console.error(`   ${error.message}\n`);
    process.exit(1);
  }
}

/**
 * AI - Manage AI servers
 */
async function ai(subcommand, mode = 'gpu') {
  const validSubcommands = ['start', 'stop', 'status'];
  const validModes = ['gpu', 'cpu', 'both'];

  if (!validSubcommands.includes(subcommand)) {
    console.error(`\n❌ Invalid AI subcommand: ${subcommand}\n`);
    console.log('Valid subcommands: start, stop, status\n');
    showHelp();
    process.exit(1);
  }

  if (subcommand === 'start' && !validModes.includes(mode)) {
    console.error(`\n❌ Invalid mode: ${mode}\n`);
    console.log('Valid modes: gpu, cpu, both\n');
    process.exit(1);
  }

  switch (subcommand) {
    case 'start':
      await aiStart(mode);
      break;
    case 'stop':
      await aiStop();
      break;
    case 'status':
      await aiStatus();
      break;
  }
}

/**
 * AI START - Start AI servers
 */
async function aiStart(mode) {
  console.log('\n🚀 Starting AI Server(s)\n');

  const scriptPath = path.resolve(__dirname, 'src/ai/scripts');

  try {
    if (mode === 'gpu' || mode === 'both') {
      // Check if already starting
      if (await isBrainServerStarting()) {
        console.log('⏳ GPU server is already starting, skipping...');
      } else if (await isPortInUse(8000)) {
        console.log('✓ GPU server already running on port 8000');
      } else {
        console.log('🎮 Starting GPU server (Vulkan)...');
        const gpuScript = path.join(scriptPath, 'start_brain_gpu.bat');
        if (await exists(gpuScript)) {
          spawn('cmd.exe', ['/c', 'start', gpuScript], { detached: true });
          console.log('  ✓ GPU server started on port 8000');
        } else {
          console.error(`  ✗ Script not found: ${gpuScript}`);
        }
      }
    }

    if (mode === 'cpu' || mode === 'both') {
      console.log('💻 Starting CPU server...');
      const cpuScript = path.join(scriptPath, 'start_brain_cpu.bat');
      if (await exists(cpuScript)) {
        spawn('cmd.exe', ['/c', 'start', cpuScript], { detached: true });
        console.log('  ✓ CPU server started on port 8002');
      } else {
        console.error(`  ✗ Script not found: ${cpuScript}`);
      }
    }

    console.log('\n💡 Servers started in new windows. Use "omnysystem ai status" to check.\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Failed to start servers:');
    console.error(`   ${error.message}\n`);
    process.exit(1);
  }
}

/**
 * AI STOP - Stop AI servers
 */
async function aiStop() {
  console.log('\n🛑 Stopping AI Servers\n');

  try {
    // Kill llama-server processes
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    await execAsync('taskkill /F /IM llama-server.exe 2>nul');
    console.log('  ✓ Stopped all AI servers\n');
    process.exit(0);
  } catch (error) {
    // taskkill returns error if no process found
    console.log('  ℹ️  No AI servers running\n');
    process.exit(0);
  }
}

/**
 * AI STATUS - Check AI server status
 */
async function aiStatus() {
  console.log('\n📊 AI Server Status\n');

  try {
    const config = await loadAIConfig();
    const client = new LLMClient(config);
    const health = await client.healthCheck();

    console.log('GPU Server (port 8000):');
    console.log(`  ${health.gpu ? '✅ RUNNING' : '❌ OFFLINE'}`);

    if (config.performance.enableCPUFallback) {
      console.log('\nCPU Server (port 8002):');
      console.log(`  ${health.cpu ? '✅ RUNNING' : '❌ OFFLINE'}`);
    } else {
      console.log('\nCPU Server: Disabled in config');
    }

    console.log('\n💡 Configuration:');
    console.log(`  LLM enabled: ${config.llm.enabled ? 'Yes' : 'No'}`);
    console.log(`  Mode: ${config.llm.mode}`);
    console.log(`  Config: ${path.resolve('src/ai/ai-config.json')}`);
    console.log('');

    if (!health.gpu && !health.cpu) {
      console.log('💡 Start servers with: omnysystem ai start [gpu|cpu|both]\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Status check failed:');
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

    case 'analyze-file':
      await analyzeFile(projectPath);
      break;

    case 'check':
      await check(projectPath);
      break;

    case 'consolidate':
      await consolidate(projectPath);
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

    case 'ai':
      const subcommand = process.argv[3];
      const mode = process.argv[4];
      await ai(subcommand, mode);
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

export { analyze, analyzeFile, check, serve, clean, status, exportMap, ai };
