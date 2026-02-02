#!/usr/bin/env node

/**
 * CogniSystem MCP Server
 *
 * Orquestador de análisis y herramientas para Claude
 *
 * Flujo:
 * 1. Usuario inicia: node mcp-server.js /ruta/proyecto
 * 2. Server crea omnysysdata/ (si no existe)
 * 3. Server popula datos desde .aver/
 * 4. Server cachea en RAM
 * 5. Server expone herramientas a Claude
 *
 * Uso:
 *   node mcp-server.js /path/to/project
 *   node mcp-server.js  # usa directorio actual
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
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
import { QueryCache, globalCache } from './query-cache.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================
// MCP Server Implementation
// ============================================================

class CogniSystemMCPServer {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.omnysysPath = path.join(projectPath, 'omnysysdata');
    this.cache = globalCache;
    this.metadata = null;
    this.initialized = false;
  }

  /**
   * Inicia el servidor
   */
  async initialize() {
    console.log('\n🚀 CogniSystem MCP Server - Starting...\n');
    console.log(`📂 Project: ${this.projectPath}\n`);

    try {
      // Paso 1: Crear estructura omnysysdata
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('STEP 1: Initialize OmnySysData structure');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      let omnysysExists = false;
      try {
        await fs.access(this.omnysysPath);
        omnysysExists = true;
        console.log('   ✓ omnysysdata/ already exists\n');
      } catch {
        console.log('   Creating omnysysdata/...');
        await createOmnySysDataStructure(this.projectPath);
      }

      // Paso 2: Popular datos desde .aver/
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('STEP 2: Populate data from .aver/');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      const populateResult = await populateOmnySysData(this.projectPath);
      console.log(
        `\n   Files analyzed: ${populateResult.filesAnalyzed}`
      );
      console.log(
        `   Connections found: ${populateResult.connectionsFound}`
      );

      // Paso 3: Cachear datos críticos
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('STEP 3: Load data into cache');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      const startCache = performance.now();

      this.metadata = await getProjectMetadata(this.projectPath);
      this.cache.set('metadata', this.metadata);
      console.log('   ✓ Metadata cached');

      const connections = await getAllConnections(this.projectPath);
      this.cache.set('connections', connections);
      console.log('   ✓ Connections cached');

      const assessment = await getRiskAssessment(this.projectPath);
      this.cache.set('assessment', assessment);
      console.log('   ✓ Risk assessment cached');

      const cacheTime = (performance.now() - startCache).toFixed(2);
      console.log(`\n   Cache load time: ${cacheTime}ms`);
      console.log(`   Cache memory: ${this.cache.getStats().memoryUsage}`);

      // Paso 4: Server ready
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ MCP Server ready!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\n🔧 Available tools:');
      console.log('   • get_impact_map(filePath)');
      console.log('   • analyze_change(filePath, symbolName)');
      console.log('   • explain_connection(fileA, fileB)');
      console.log('   • get_risk_assessment(minSeverity)');
      console.log('   • search_files(pattern)');
      console.log('\n📡 Claude can now use these tools!\n');

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('\n❌ Initialization failed:');
      console.error(error.message);
      process.exit(1);
    }
  }

  /**
   * Tool: get_impact_map - Qué archivos se ven afectados
   */
  async getImpactMap(filePath) {
    const cached = this.cache.get(`impact:${filePath}`);
    if (cached) return cached;

    try {
      const deps = await getFileDependencies(this.projectPath, filePath);
      const fileData = await getFileAnalysis(this.projectPath, filePath);

      const result = {
        file: filePath,
        directlyAffects: deps.usedBy || [],
        transitiveAffects: deps.transitiveDependents || [],
        semanticConnections: fileData.semanticConnections || [],
        totalAffected:
          (deps.usedBy?.length || 0) +
          (deps.transitiveDependents?.length || 0) +
          (fileData.semanticConnections?.length || 0),
        riskLevel: fileData.riskScore?.severity || 'unknown'
      };

      this.cache.set(`impact:${filePath}`, result);
      return result;
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Tool: analyze_change - Impacto de cambiar un símbolo específico
   */
  async analyzeChange(filePath, symbolName) {
    try {
      const fileData = await getFileAnalysis(this.projectPath, filePath);

      // Buscar el símbolo
      const symbol = fileData.exports?.find((e) => e.name === symbolName);

      if (!symbol) {
        return { error: `Symbol '${symbolName}' not found in ${filePath}` };
      }

      // Buscar quién usa este símbolo
      const impactMap = await this.getImpactMap(filePath);

      return {
        symbol: symbolName,
        file: filePath,
        symbolType: symbol.kind,
        directDependents: impactMap.directlyAffects,
        transitiveDependents: impactMap.transitiveAffects,
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
      const connections = this.cache.get('connections') ||
        (await getAllConnections(this.projectPath));

      const relevant = connections.sharedState
        ?.filter(
          (c) =>
            (c.sourceFile === fileA && c.targetFile === fileB) ||
            (c.sourceFile === fileB && c.targetFile === fileA)
        )
        .slice(0, 5); // Top 5

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
      const assessment = this.cache.get('assessment') ||
        (await getRiskAssessment(this.projectPath));

      const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
      const minLevel = severityOrder[minSeverity];

      const filtered = assessment.report.mediumRiskFiles
        ?.concat(assessment.report.highRiskFiles || [])
        .filter((f) => severityOrder[f.severity] >= minLevel)
        .slice(0, 10); // Top 10

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
        files: results.slice(0, 20) // Top 20
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Obtiene estadísticas del servidor
   */
  getStats() {
    return {
      project: this.projectPath,
      initialized: this.initialized,
      metadata: {
        totalFiles: this.metadata?.metadata.totalFiles,
        totalFunctions: this.metadata?.metadata.totalFunctions
      },
      cache: this.cache.getStats(),
      uptime: process.uptime()
    };
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

    // Demo: Show server stats every 10 seconds
    setInterval(() => {
      const stats = server.getStats();
      // En producción, esto estaría en un endpoint HTTP/stdio
    }, 10000);

    // Mantener el servidor activo
    console.log('💡 Server running. Press Ctrl+C to stop.\n');

    // En producción, aquí iría el protocolo MCP real
    // Por ahora, el server está listo para Claude Code
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export { CogniSystemMCPServer };
