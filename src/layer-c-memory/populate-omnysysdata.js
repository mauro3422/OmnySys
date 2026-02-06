#!/usr/bin/env node

/**
 * Populate OmnySysData
 *
 * Toma datos de .OmnySysData/ y los coloca en omnysysdata/
 * para que el MCP Server pueda acceder a ellos
 *
 * Uso:
 *   node populate-omnysysdata.js /ruta/proyecto
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getProjectMetadata,
  getFileAnalysis,
  getAllConnections,
  getRiskAssessment,
  getProjectStats,
  getMultipleFiles
} from '../layer-a-static/storage/query-service.js';
import { createOmnySysDataStructure } from './omnysysdata-generator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Popula omnysysdata/ con datos desde .OmnySysData/
 */
export async function populateOmnySysData(projectPath) {
  const omnysysPath = path.join(projectPath, '.omnysysdata');
  const dataPath = path.join(projectPath, '.omnysysdata');

  console.log('🔄 Populating OmnySysData...\n');

  try {
    // Verificar que .OmnySysData/ existe
    await fs.access(dataPath);
  } catch {
    console.error('❌ Error: .OmnySysData/ directory not found');
    console.error('   Run the analyzer first: node analyzer.js');
    process.exit(1);
  }

  try {
    // 1. Crear estructura si no existe
    try {
      await fs.access(omnysysPath);
      console.log('   ✓ omnysysdata/ already exists');
    } catch {
      console.log('   Creating omnysysdata/ structure...');
      await createOmnySysDataStructure(projectPath);
    }

    console.log('\n📊 Collecting analysis data...\n');

    // 2. Leer metadata
    const metadata = await getProjectMetadata(projectPath);
    console.log(`   ✓ Metadata: ${metadata.metadata.totalFiles} files`);

    // 3. Actualizar system-structure.json
    const allFilePaths = Object.keys(metadata.fileIndex);
    const systemStructure = {
      metadata: metadata.metadata,
      fileIndex: metadata.fileIndex,
      statistics: {
        totalFiles: allFilePaths.length,
        analysisDate: new Date().toISOString()
      }
    };

    await fs.writeFile(
      path.join(omnysysPath, 'system-structure.json'),
      JSON.stringify(systemStructure, null, 2)
    );

    // 4. Copiar conexiones
    const connections = await getAllConnections(projectPath);
    const connectionsDir = path.join(omnysysPath, 'connections');

    await fs.writeFile(
      path.join(connectionsDir, 'all-connections.json'),
      JSON.stringify(connections, null, 2)
    );
    console.log(
      `   ✓ Connections: ${connections.sharedState.length} shared-state, ${connections.eventListeners.length} events`
    );

    // 5. Copiar risk assessment
    const risks = await getRiskAssessment(projectPath);
    const risksDir = path.join(omnysysPath, 'risks');

    await fs.writeFile(
      path.join(risksDir, 'assessment.json'),
      JSON.stringify(risks, null, 2)
    );
    const summary = risks.report.summary;
    console.log(
      `   ✓ Risks: ${summary.criticalCount} critical, ${summary.highCount} high, ${summary.mediumCount} medium`
    );

    // 6. Cargar archivos individuales
    console.log(`\n   Loading individual file analyses...`);
    const filesDir = path.join(omnysysPath, 'files');
    let loadedCount = 0;

    for (const filePath of allFilePaths) {
      try {
        const fileData = await getFileAnalysis(projectPath, filePath);

        // Crear subdirectorios si es necesario
        const fileDir = path.dirname(filePath);
        if (fileDir !== '.') {
          const targetDir = path.join(filesDir, fileDir);
          await fs.mkdir(targetDir, { recursive: true });
        }

        // Guardar archivo
        const fileName = path.basename(filePath);
        const targetPath = path.join(filesDir, fileDir, `${fileName}.json`);
        await fs.writeFile(targetPath, JSON.stringify(fileData, null, 2));

        loadedCount++;
        if (loadedCount % 10 === 0) {
          process.stdout.write(`   ${loadedCount}/${allFilePaths.length}\r`);
        }
      } catch (error) {
        console.warn(`   ⚠️ Could not load ${filePath}: ${error.message}`);
      }
    }
    console.log(
      `   ✓ Loaded ${loadedCount}/${allFilePaths.length} file analyses\n`
    );

    // 7. Crear mcp-tools definition
    const mcp_tools = {
      version: '1.0.0',
      tools: [
        {
          name: 'get_impact_map',
          description: 'Get all files affected by editing a specific file',
          input: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Path to the file to analyze'
              }
            },
            required: ['filePath']
          }
        },
        {
          name: 'analyze_change',
          description: 'Analyze impact of changing a specific symbol',
          input: {
            type: 'object',
            properties: {
              filePath: { type: 'string' },
              symbolName: { type: 'string' }
            },
            required: ['filePath', 'symbolName']
          }
        },
        {
          name: 'explain_connection',
          description: 'Explain why two files are connected',
          input: {
            type: 'object',
            properties: {
              fileA: { type: 'string' },
              fileB: { type: 'string' }
            },
            required: ['fileA', 'fileB']
          }
        },
        {
          name: 'get_risk_assessment',
          description: 'Get risk scores for all files',
          input: {
            type: 'object',
            properties: {
              minSeverity: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'critical']
              }
            }
          }
        },
        {
          name: 'search_files',
          description: 'Search files by pattern',
          input: {
            type: 'object',
            properties: {
              pattern: { type: 'string' }
            },
            required: ['pattern']
          }
        }
      ]
    };

    const toolsDir = path.join(omnysysPath, 'mcp-tools');
    await fs.writeFile(
      path.join(toolsDir, 'tools.json'),
      JSON.stringify(mcp_tools, null, 2)
    );
    console.log('   ✓ MCP tools definition');

    // 8. Summary
    const stats = await getProjectStats(projectPath);

    console.log('\n' + '='.repeat(50));
    console.log('✅ OmnySysData populated successfully!');
    console.log('='.repeat(50));
    console.log('\n📊 Summary:');
    console.log(`   Files analyzed: ${stats.totalFiles}`);
    console.log(`   Total functions: ${stats.totalFunctions}`);
    console.log(`   Semantic connections: ${stats.totalSemanticConnections}`);
    console.log(`   High risk files: ${stats.highRiskFiles}`);
    console.log(`   Medium risk files: ${stats.mediumRiskFiles}`);
    console.log(`\n📍 Location: ./omnysysdata/`);
    console.log('\n🚀 Next: Start MCP Server');
    console.log('   node mcp-server.js\n');

    return {
      success: true,
      filesAnalyzed: loadedCount,
      connectionsFound: connections.total,
      riskAssessment: summary
    };
  } catch (error) {
    console.error('\n❌ Error populating OmnySysData:');
    console.error(error.message);
    process.exit(1);
  }
}

// CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const projectPath = process.argv[2] || process.cwd();
  await populateOmnySysData(projectPath);
}
