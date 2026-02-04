#!/usr/bin/env node

/**
 * CogniSystem MCP Server
 * 
 * ENTRY POINT ÚNICO del sistema.
 * 
 * Responsabilidades:
 * 1. Inicializar Orchestrator (cola, worker, file watcher)
 * 2. Iniciar indexación en background (si es necesario)
 * 3. Exponer tools para Claude/IA
 * 4. Si un archivo no está analizado, encolarlo como CRITICAL
 * 
 * Flujo:
 *   node mcp-server.js /ruta/proyecto
 *   → Inicia Orchestrator
 *   → Inicia indexación background (si no hay datos)
 *   → Server listo para recibir queries
 * 
 * Uso por IA:
 *   const impact = await get_impact_map("CameraState.js");
 *   // Si no está analizado, se encola automáticamente y espera
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
} from '../layer-a-static/storage/query-service.js';
import { createOmnySysDataStructure } from './omnysysdata-generator.js';
import { populateOmnySysData } from './populate-omnysysdata.js';
import { UnifiedCacheManager } from '../core/unified-cache-manager.js';
import { Orchestrator } from '../core/orchestrator.js';
import { loadAIConfig, LLMClient } from '../ai/llm-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================
// CogniSystem MCP Server - Entry Point Único
// ============================================================

class CogniSystemMCPServer {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.omnysysPath = path.join(projectPath, 'omnysysdata');
    this.cache = null;
    this.metadata = null;
    this.initialized = false;
    this.statsInterval = null;

    // 🔥 NUEVO: Orchestrator como componente interno
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
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║     CogniSystem MCP Server v3.0.0                         ║');
    console.log('║     Entry Point Único - IA-Native Architecture            ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    console.log(`📂 Project: ${this.projectPath}\n`);

    try {
      // ==========================================
      // STEP 0: Inicializar Orchestrator
      // ==========================================
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('STEP 0: Initialize Orchestrator');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      await this.orchestrator.initialize();
      console.log('  ✓ Orchestrator ready (Queue + Worker + FileWatcher)\n');

      // ==========================================
      // STEP 1: Setup LLM Server
      // ==========================================
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('STEP 1: AI Server Setup');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      await this.autoStartLLM();

      // ==========================================
      // STEP 2: Crear estructura de datos
      // ==========================================
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('STEP 2: Initialize Data Structure');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      let omnysysExists = false;
      try {
        await fs.access(this.omnysysPath);
        omnysysExists = true;
        console.log('  ✓ omnysysdata/ already exists\n');
      } catch {
        console.log('  Creating omnysysdata/...');
        await createOmnySysDataStructure(this.projectPath);
      }

      // ==========================================
      // STEP 3: Cargar datos existentes
      // ==========================================
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('STEP 3: Load Existing Data');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      const hasAnalysis = await this._hasExistingAnalysis();
      
      if (hasAnalysis) {
        const populateResult = await populateOmnySysData(this.projectPath);
        console.log(`  ✓ Files analyzed: ${populateResult.filesAnalyzed}`);
        console.log(`  ✓ Connections found: ${populateResult.connectionsFound}\n`);
      } else {
        console.log('  ⚠️  No analysis data found\n');
      }

      // ==========================================
      // STEP 4: Cachear datos críticos
      // ==========================================
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('STEP 4: Load into Cache');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      const startCache = performance.now();

      this.cache = new UnifiedCacheManager(this.projectPath, {
        enableChangeDetection: true,
        cascadeInvalidation: true
      });
      await this.cache.initialize();

      this.metadata = await getProjectMetadata(this.projectPath);
      this.cache.ramCacheSet('metadata', this.metadata);
      console.log('  ✓ Metadata cached');

      const connections = await getAllConnections(this.projectPath);
      this.cache.ramCacheSet('connections', connections);
      console.log('  ✓ Connections cached');

      const assessment = await getRiskAssessment(this.projectPath);
      this.cache.ramCacheSet('assessment', assessment);
      console.log('  ✓ Risk assessment cached');

      const cacheTime = (performance.now() - startCache).toFixed(2);
      console.log(`\n  Cache load time: ${cacheTime}ms`);
      console.log(`  Cache memory: ${this.cache.getCacheStats().memoryUsage}\n`);

      // ==========================================
      // STEP 5: Iniciar indexación si es necesario
      // ==========================================
      if (!hasAnalysis) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('STEP 5: Start Background Indexing');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('  🔄 Starting Layer A analysis in background...');
        console.log('  ⏳ This will run while server is operational\n');
        
        this.orchestrator.startBackgroundIndexing();
      }

      // ==========================================
      // STEP 6: Server Ready
      // ==========================================
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ MCP Server Ready!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\n🔧 Available tools:');
      console.log('   • get_impact_map(filePath)');
      console.log('   • analyze_change(filePath, symbolName)');
      console.log('   • explain_connection(fileA, fileB)');
      console.log('   • get_risk_assessment(minSeverity)');
      console.log('   • search_files(pattern)');
      console.log('   • get_server_status()');
      console.log('\n📡 Claude can now use these tools!');
      console.log('💡 If a file is not analyzed, it will be auto-queued as CRITICAL\n');

      this.initialized = true;
      
      // Emitir evento de ready
      this.orchestrator.emit('mcp:ready');
      
      return true;
    } catch (error) {
      console.error('\n❌ Initialization failed:');
      console.error(error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }

  /**
   * Tool: get_impact_map - Qué archivos se ven afectados
   * 🔥 Si el archivo no está analizado, lo encola como CRITICAL y espera
   */
  async getImpactMap(filePath) {
    const cached = this.cache.ramCacheGet(`impact:${filePath}`);
    if (cached) return cached;

    try {
      // Verificar si el archivo está analizado
      const fileData = await getFileAnalysis(this.projectPath, filePath);
      
      if (!fileData) {
        // 🔥 NUEVO: Archivo no analizado → Encolar como CRITICAL
        console.log(`\n🚨 File not analyzed: ${filePath}`);
        console.log(`⏳ Queueing as CRITICAL priority...`);
        
        // Usar orchestrator para analizar y esperar
        const result = await this.orchestrator.analyzeAndWait(filePath, 60000);
        
        console.log(`✅ Analysis completed for: ${filePath}\n`);
        
        // Ahora sí obtener los datos
        return await this._buildImpactMap(filePath);
      }

      return await this._buildImpactMap(filePath);
    } catch (error) {
      return { error: error.message, filePath };
    }
  }

  /**
   * Tool: analyze_change - Impacto de cambiar un símbolo específico
   */
  async analyzeChange(filePath, symbolName) {
    try {
      // Asegurar que el archivo esté analizado
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
            ? '⚠️ HIGH RISK - This change affects many files'
            : '✓ Safe - Limited scope'
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Tool: explain_connection - Por qué dos archivos están conectados
   */
  async explainConnection(fileA, fileB) {
    try {
      // Asegurar que ambos archivos estén analizados
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
   * Tool: get_risk_assessment - Evaluación de riesgos
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
            ? '🚨 Critical issues detected - Review high-risk files'
            : '✓ Risk levels acceptable'
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
      cache: this.cache.getCacheStats()
    };
  }

  /**
   * Obtiene estadísticas del servidor
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
      cache: this.cache.getCacheStats(),
      uptime: process.uptime()
    };
  }

  /**
   * Detiene el servidor y limpia recursos
   */
  async stop() {
    console.log('\n👋 Stopping MCP server...');
    
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }

    await this.orchestrator.stop();
    
    this.initialized = false;
    console.log('✅ MCP server stopped');
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

    this.cache.ramCacheSet(`impact:${filePath}`, result);
    return result;
  }

  async _ensureAnalyzed(filePath) {
    let fileData = await getFileAnalysis(this.projectPath, filePath);
    
    if (!fileData) {
      console.log(`⏳ Auto-analyzing: ${filePath}`);
      await this.orchestrator.analyzeAndWait(filePath, 60000);
      fileData = await getFileAnalysis(this.projectPath, filePath);
    }
    
    return fileData;
  }

  async _hasExistingAnalysis() {
    try {
      const indexPath = path.join(this.projectPath, '.OmnySystemData', 'index.json');
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
        console.log('   ℹ️  LLM disabled in config\n');
        return false;
      }

      const client = new LLMClient(aiConfig);
      const health = await client.healthCheck();

      if (health.gpu || health.cpu) {
        console.log('   ✓ LLM server already running\n');
        return true;
      }

      console.log('   🚀 Starting LLM server...');

      const scriptPath = path.resolve(this.projectPath, 'src/ai/scripts');
      const mode = aiConfig.llm.mode || 'gpu';

      if (mode === 'gpu' || mode === 'both') {
        const gpuScript = path.join(scriptPath, 'start_brain_gpu.bat');
        try {
          await fs.access(gpuScript);
          spawn('cmd.exe', ['/c', 'start', '/min', gpuScript], {
            detached: true,
            stdio: 'ignore'
          }).unref();
          console.log('   ✓ GPU server starting (port 8000)...');
        } catch {
          console.log('   ⚠️  GPU script not found');
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
          console.log('   ✓ CPU server starting (port 8002)...');
        } catch {
          console.log('   ⚠️  CPU script not found');
        }
      }

      await new Promise(resolve => setTimeout(resolve, 3000));

      const healthAfter = await client.healthCheck();
      if (healthAfter.gpu || healthAfter.cpu) {
        console.log('   ✓ LLM server started successfully\n');
        return true;
      } else {
        console.log('   ⚠️  LLM server failed to start\n');
        return false;
      }
    } catch (error) {
      console.log(`   ⚠️  LLM auto-start failed: ${error.message}\n`);
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

    console.log('💡 Server running. Press Ctrl+C to stop.\n');

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
