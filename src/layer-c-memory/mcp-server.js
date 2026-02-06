#!/usr/bin/env node

/**
 * CogniSystem MCP Server
 * 
 * ENTRY POINT ÃšNICO del sistema.
 * 
 * Responsabilidades:
 * 1. Inicializar Orchestrator (cola, worker, file watcher)
 * 2. Iniciar indexaciÃ³n en background (si es necesario)
 * 3. Exponer tools para Claude/IA
 * 4. Si un archivo no estÃ¡ analizado, encolarlo como CRITICAL
 * 
 * Flujo:
 *   node mcp-server.js /ruta/proyecto
 *   â†’ Inicia Orchestrator
 *   â†’ Inicia indexaciÃ³n background (si no hay datos)
 *   â†’ Server listo para recibir queries
 * 
 * Uso por IA:
 *   const impact = await get_impact_map("CameraState.js");
 *   // Si no estÃ¡ analizado, se encola automÃ¡ticamente y espera
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import {
  getProjectMetadata,
  getFileAnalysis,
  getAllConnections,
  getRiskAssessment,
  getFileDependencies,
  findFiles
} from '../layer-a-static/query/index.js';
import { createOmnySysDataStructure } from './omnysysdata-generator.js';
import { populateOmnySysData } from './populate-omnysysdata.js';
import { UnifiedCacheManager } from '../core/unified-cache-manager.js';
import { Orchestrator } from '../core/orchestrator.js';
import { loadAIConfig, LLMClient } from '../ai/llm-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Helper function to read JSON files
async function readJSON(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to read ${filePath}: ${error.message}`);
  }
}

// ============================================================
// CogniSystem MCP Server - Entry Point Único
// ============================================================
// CogniSystem MCP Server - Entry Point Ãšnico
// ============================================================

class CogniSystemMCPServer {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.omnysysPath = path.join(projectPath, '.omnysysdata');
    this.cache = null;
    this.metadata = null;
    this.initialized = false;
    this.statsInterval = null;

    // ðŸ”¥ NUEVO: Orchestrator como componente interno
    this.orchestrator = new Orchestrator(projectPath, {
      enableFileWatcher: true,
      enableWebSocket: true,
      autoStartLLM: true
    });
  }

  /**
   * Inicializa el sistema completo
   */
  async initialize() {
    console.log('\nâ•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—');
    console.log('â•‘     CogniSystem MCP Server v3.0.0                         â•‘');
    console.log('â•‘     Entry Point Ãšnico - IA-Native Architecture            â•‘');
    console.log('â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n');
    console.log(`ðŸ“‚ Project: ${this.projectPath}\n`);

    try {
      // ==========================================
      // STEP 0: Inicializar Orchestrator
      // ==========================================
      console.log('â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”');
      console.log('STEP 0: Initialize Orchestrator');
      console.log('â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”');
      
      await this.orchestrator.initialize();
      console.log('  âœ“ Orchestrator ready (Queue + Worker + FileWatcher)\n');

      // ==========================================
      // STEP 1: Setup LLM Server
      // ==========================================
      console.log('â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”');
      console.log('STEP 1: AI Server Setup');
      console.log('â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”');
      await this.autoStartLLM();

      // ==========================================
      // STEP 2: Crear estructura de datos
      // ==========================================
      console.log('â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”');
      console.log('STEP 2: Initialize Data Structure');
      console.log('â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”');

      let omnysysExists = false;
      try {
        await fs.access(this.omnysysPath);
        omnysysExists = true;
        console.log('  ✓ .omnysysdata/ already exists\n');
      } catch {
        console.log('  Creating .omnysysdata/...');
        await createOmnySysDataStructure(this.projectPath);
      }

      // ==========================================
      // STEP 3: Initialize Cache (Lazy Loading)
      // ==========================================
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('STEP 3: Initialize Cache (Lazy Loading)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      const startCache = performance.now();

      this.cache = new UnifiedCacheManager(this.projectPath, {
        enableChangeDetection: true,
        cascadeInvalidation: true
      });
      await this.cache.initialize();

      // Check if data already populated
      const hasAnalysis = await this._hasExistingAnalysis();
      
      if (hasAnalysis && !omnysysExists) {
        // Only populate if analysis exists but not yet in .omnysysdata
        console.log('  🔄 Populating .omnysysdata/ from analysis...');
        const populateResult = await populateOmnySysData(this.projectPath);
        console.log(`  ✓ Files analyzed: ${populateResult.filesAnalyzed}`);
        console.log(`  ✓ Connections found: ${populateResult.connectionsFound}\n`);
      } else if (omnysysExists) {
        // Data already populated - just load index
        const indexPath = path.join(this.omnysysPath, 'index.json');
        const indexData = await readJSON(indexPath);
        const totalFiles = indexData.metadata?.totalFiles || indexData.totalFiles || 0;
        this.cache.set('metadata', { 
          totalFiles: totalFiles,
          indexedAt: indexData.metadata?.analyzedAt || indexData.indexedAt 
        });
        console.log(`  ✓ Using existing .omnysysdata/ (${totalFiles} files)`);
        console.log('  ⚡ Data loaded lazily (on-demand)\n');
      } else {
        console.log('  ⚠️  No analysis data found\n');
      }

      const cacheTime = (performance.now() - startCache).toFixed(2);
      console.log(`  Cache init time: ${cacheTime}ms\n`);

      // ==========================================
      // STEP 4: Start Background Indexing if needed
      // ==========================================
      if (!hasAnalysis && !omnysysExists) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('STEP 4: Start Background Indexing');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('  🔄 Starting Layer A analysis in background...');
        console.log('  ⏳ This will run while server is operational\n');
        
        this.orchestrator.startBackgroundIndexing();
      }

      // ==========================================
      // STEP 5: Server Ready
      // ==========================================
      console.log('â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”');
      console.log('âœ… MCP Server Ready!');
      console.log('â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”');
      console.log('\nðŸ”§ Available tools:');
      console.log('   â€¢ get_impact_map(filePath)');
      console.log('   â€¢ analyze_change(filePath, symbolName)');
      console.log('   â€¢ explain_connection(fileA, fileB)');
      console.log('   â€¢ get_risk_assessment(minSeverity)');
      console.log('   â€¢ search_files(pattern)');
      console.log('   â€¢ get_server_status()');
      console.log('\nðŸ“¡ Claude can now use these tools!');
      console.log('ðŸ’¡ If a file is not analyzed, it will be auto-queued as CRITICAL\n');

      this.initialized = true;
      
      // Emitir evento de ready
      this.orchestrator.emit('mcp:ready');
      
      return true;
    } catch (error) {
      console.error('\nâŒ Initialization failed:');
      console.error(error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }

  /**
   * Tool: get_impact_map - QuÃ© archivos se ven afectados
   * ðŸ”¥ Si el archivo no estÃ¡ analizado, lo encola como CRITICAL y espera
   */
  async getImpactMap(filePath) {
    const cached = this.cache.ramCacheGet(`impact:${filePath}`);
    if (cached) return cached;

    try {
      // Verificar si el archivo estÃ¡ analizado
      const fileData = await getFileAnalysis(this.projectPath, filePath);
      
      if (!fileData) {
        // ðŸ”¥ NUEVO: Archivo no analizado â†’ Encolar como CRITICAL
        console.log(`\nðŸš¨ File not analyzed: ${filePath}`);
        console.log(`â³ Queueing as CRITICAL priority...`);
        
        // Usar orchestrator para analizar y esperar
        const result = await this.orchestrator.analyzeAndWait(filePath, 60000);
        
        console.log(`âœ… Analysis completed for: ${filePath}\n`);
        
        // Ahora sÃ­ obtener los datos
        return await this._buildImpactMap(filePath);
      }

      return await this._buildImpactMap(filePath);
    } catch (error) {
      return { error: error.message, filePath };
    }
  }

  /**
   * Tool: analyze_change - Impacto de cambiar un sÃ­mbolo especÃ­fico
   */
  async analyzeChange(filePath, symbolName) {
    try {
      // Asegurar que el archivo estÃ© analizado
      const fileData = await this._ensureAnalyzed(filePath);
      
      if (!fileData) {
        return { error: `Could not analyze ${filePath}` };
      }

      const symbol = fileData.exports?.find((e) => e.name === symbolName);

      if (!symbol) {
        return { error: `Symbol '${symbolName}' not found in ${filePath}` };
      }

      const impactMap = await this.getImpactMap(filePath);

      return {
        symbol: symbolName,
        file: filePath,
        symbolType: symbol.kind,
        directDependents: impactMap.directlyAffects || [],
        transitiveDependents: impactMap.transitiveAffects || [],
        riskLevel: fileData.riskScore?.severity,
        recommendation:
          fileData.riskScore?.severity === 'critical'
            ? 'âš ï¸ HIGH RISK - This change affects many files'
            : 'âœ“ Safe - Limited scope'
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Tool: explain_connection - Por quÃ© dos archivos estÃ¡n conectados
   */
  async explainConnection(fileA, fileB) {
    try {
      // Asegurar que ambos archivos estÃ©n analizados
      await this._ensureAnalyzed(fileA);
      await this._ensureAnalyzed(fileB);

      const connections = this.cache.ramCacheGet('connections') ||
        (await getAllConnections(this.projectPath));

      const relevant = connections.sharedState
        ?.filter(
          (c) =>
            (c.sourceFile === fileA && c.targetFile === fileB) ||
            (c.sourceFile === fileB && c.targetFile === fileA)
        )
        .slice(0, 5);

      if (!relevant || relevant.length === 0) {
        return {
          fileA,
          fileB,
          connected: false,
          reason: 'No direct connections found'
        };
      }

      return {
        fileA,
        fileB,
        connected: true,
        connections: relevant.map((c) => ({
          type: c.type,
          property: c.globalProperty,
          reason: c.reason,
          severity: c.severity
        }))
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Tool: get_risk_assessment - EvaluaciÃ³n de riesgos
   */
  async getRiskAssessment(minSeverity = 'medium') {
    try {
      const assessment = this.cache.ramCacheGet('assessment') ||
        (await getRiskAssessment(this.projectPath));

      const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
      const minLevel = severityOrder[minSeverity];

      const filtered = assessment.report.mediumRiskFiles
        ?.concat(assessment.report.highRiskFiles || [])
        .filter((f) => severityOrder[f.severity] >= minLevel)
        .slice(0, 10);

      return {
        summary: assessment.report.summary,
        topRiskFiles: filtered,
        recommendation:
          assessment.report.summary.criticalCount > 0
            ? 'ðŸš¨ Critical issues detected - Review high-risk files'
            : 'âœ“ Risk levels acceptable'
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Tool: search_files - Buscar archivos
   */
  async searchFiles(pattern) {
    try {
      const results = await findFiles(this.projectPath, pattern);
      return {
        pattern,
        found: results.length,
        files: results.slice(0, 20)
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Tool: get_server_status - Estado del servidor
   */
  async getServerStatus() {
    const orchestratorStatus = this.orchestrator.getStatus();
    
    return {
      initialized: this.initialized,
      orchestrator: orchestratorStatus,
      metadata: {
        totalFiles: this.metadata?.metadata?.totalFiles || 0,
        totalFunctions: this.metadata?.metadata?.totalFunctions || 0
      },
      cache: this.cache.getRamStats()
    };
  }

  /**
   * Obtiene estadÃ­sticas del servidor
   */
  getStats() {
    return {
      project: this.projectPath,
      initialized: this.initialized,
      orchestrator: this.orchestrator.getStatus(),
      metadata: {
        totalFiles: this.metadata?.metadata?.totalFiles,
        totalFunctions: this.metadata?.metadata?.totalFunctions
      },
      cache: this.cache.getRamStats(),
      uptime: process.uptime()
    };
  }

  /**
   * Detiene el servidor y limpia recursos
   */
  async stop() {
    console.log('\nðŸ‘‹ Stopping MCP server...');
    
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }

    await this.orchestrator.stop();
    
    this.initialized = false;
    console.log('âœ… MCP server stopped');
  }

  // ==========================================
  // Private methods
  // ==========================================

  async _buildImpactMap(filePath) {
    const deps = await getFileDependencies(this.projectPath, filePath);
    const fileData = await getFileAnalysis(this.projectPath, filePath);

    const result = {
      file: filePath,
      directlyAffects: deps.usedBy || [],
      transitiveAffects: deps.transitiveDependents || [],
      semanticConnections: fileData?.semanticConnections || [],
      totalAffected:
        (deps.usedBy?.length || 0) +
        (deps.transitiveDependents?.length || 0) +
        (fileData?.semanticConnections?.length || 0),
      riskLevel: fileData?.riskScore?.severity || 'unknown',
      subsystem: fileData?.subsystem
    };

    this.cache.set(`impact:${filePath}`, result);
    return result;
  }

  async _ensureAnalyzed(filePath) {
    let fileData = await getFileAnalysis(this.projectPath, filePath);
    
    if (!fileData) {
      console.log(`â³ Auto-analyzing: ${filePath}`);
      await this.orchestrator.analyzeAndWait(filePath, 60000);
      fileData = await getFileAnalysis(this.projectPath, filePath);
    }
    
    return fileData;
  }

  async _hasExistingAnalysis() {
    try {
      const indexPath = path.join(this.projectPath, '.omnysysdata', 'index.json');
      await fs.access(indexPath);
      return true;
    } catch {
      return false;
    }
  }

  async autoStartLLM() {
    try {
      const aiConfig = await loadAIConfig();

      if (!aiConfig.llm.enabled) {
        console.log('   â„¹ï¸  LLM disabled in config\n');
        return false;
      }

      const client = new LLMClient(aiConfig);
      const health = await client.healthCheck();

      if (health.gpu || health.cpu) {
        console.log('   âœ“ LLM server already running\n');
        return true;
      }

      console.log('   ðŸš€ Starting LLM server...');

      const scriptPath = path.resolve(this.projectPath, 'src/ai/scripts');
      const mode = aiConfig.llm.mode || 'gpu';

      if (mode === 'gpu' || mode === 'both') {
        const gpuScript = path.join(scriptPath, 'brain_gpu.bat');
        try {
          await fs.access(gpuScript);
          spawn('cmd.exe', ['/c', 'start', '/min', gpuScript], {
            detached: true,
            stdio: 'ignore'
          }).unref();
          console.log('   âœ“ GPU server starting (port 8000)...');
        } catch {
          console.log('   âš ï¸  GPU script not found');
        }
      }

      if (mode === 'cpu' || mode === 'both') {
        const cpuScript = path.join(scriptPath, 'start_brain_cpu.bat');
        try {
          await fs.access(cpuScript);
          spawn('cmd.exe', ['/c', 'start', '/min', cpuScript], {
            detached: true,
            stdio: 'ignore'
          }).unref();
          console.log('   âœ“ CPU server starting (port 8002)...');
        } catch {
          console.log('   âš ï¸  CPU script not found');
        }
      }

      await new Promise(resolve => setTimeout(resolve, 3000));

      const healthAfter = await client.healthCheck();
      if (healthAfter.gpu || healthAfter.cpu) {
        console.log('   âœ“ LLM server started successfully\n');
        return true;
      } else {
        console.log('   âš ï¸  LLM server failed to start\n');
        return false;
      }
    } catch (error) {
      console.log(`   âš ï¸  LLM auto-start failed: ${error.message}\n`);
      return false;
    }
  }
}

// ============================================================
// CLI Entry Point
// ============================================================

async function main() {
  const projectPath = process.argv[2] || process.cwd();

  const server = new CogniSystemMCPServer(projectPath);

  try {
    await server.initialize();

    // Stats every 30 seconds
    server.statsInterval = setInterval(() => {
      const stats = server.getStats();
      // Silent in production
    }, 30000);
    
    // Cleanup on exit
    process.on('SIGINT', async () => {
      await server.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await server.stop();
      process.exit(0);
    });

    console.log('ðŸ’¡ Server running. Press Ctrl+C to stop.\n');

    // Keep alive
    await new Promise(() => {});
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export { CogniSystemMCPServer };

