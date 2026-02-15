import fs from 'fs/promises';
import path from 'path';
import { hasExistingAnalysis } from '../../layer-a-static/storage/storage-manager/setup/index.js';
import { normalizePath } from '../utils/paths.js';

const SEPARATOR = '------------------------------------------------------------';

export async function check(filePath) {
  if (!filePath) {
    console.error('\nError: No file specified!');
    console.error('\nUsage: omnysystem check <file-path>');
    console.error('   Example: omnysystem check src/api.js\n');
    process.exit(1);
  }

  const absoluteFilePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);

  const projectPath = process.cwd();

  console.log(`\nImpact Analysis: ${path.basename(filePath)}\n`);
  console.log(`Project: ${projectPath}`);
  console.log(`File: ${filePath}\n`);

  try {
    const hasAnalysis = await hasExistingAnalysis(projectPath);
    if (!hasAnalysis) {
      console.error('No analysis data found!');
      console.error('\nRun first:');
      console.error('   omnysystem analyze .\n');
      process.exit(1);
    }

    const systemMapPath = path.join(projectPath, 'system-map-enhanced.json');
    const systemMapContent = await fs.readFile(systemMapPath, 'utf-8');
    const systemMap = JSON.parse(systemMapContent);

    const normalizedFilePath = normalizePath(filePath);
    let fileData = null;
    let matchedPath = null;

    for (const [key, value] of Object.entries(systemMap.files || {})) {
      const normalizedKey = normalizePath(key);
      if (normalizedKey.endsWith(normalizedFilePath) || normalizedFilePath.endsWith(normalizedKey)) {
        fileData = value;
        matchedPath = key;
        break;
      }
    }

    if (!fileData) {
      console.error(`File not found in analysis: ${filePath}`);
      console.error('\nAvailable files:');
      const availableFiles = Object.keys(systemMap.files || {}).slice(0, 10);
      for (const f of availableFiles) {
        console.error(`   - ${f}`);
      }
      console.error('   ...\n');
      process.exit(1);
    }

    if (matchedPath && matchedPath !== filePath) {
      console.log(`Resolved file path: ${matchedPath}\n`);
    }

    console.log(`${SEPARATOR}\n`);

    console.log('FILE METRICS');
    console.log(`   Functions: ${fileData.functions?.length || 0}`);
    console.log(`   Exports: ${fileData.exports?.length || 0}`);
    console.log(`   Imports: ${fileData.imports?.length || 0}`);
    console.log(`   Risk Score: ${fileData.riskScore?.total || 0}/10 (${fileData.riskScore?.severity || 'low'})`);
    console.log();

    console.log('DEPENDENCIES');
    if (fileData.dependsOn?.length > 0) {
      console.log('   This file imports from:');
      for (const dep of fileData.dependsOn.slice(0, 10)) {
        console.log(`     - ${dep}`);
      }
      if (fileData.dependsOn.length > 10) {
        console.log(`     ... and ${fileData.dependsOn.length - 10} more`);
      }
    } else {
      console.log('   No imports (standalone file)');
    }
    console.log();

    if (fileData.usedBy?.length > 0) {
      console.log('IMPORTED BY:');
      for (const user of fileData.usedBy.slice(0, 10)) {
        console.log(`     - ${user}`);
      }
      if (fileData.usedBy.length > 10) {
        console.log(`     ... and ${fileData.usedBy.length - 10} more`);
      }
      console.log(`\n   Changing exports will break ${fileData.usedBy.length} file(s)\n`);
    } else {
      console.log('   Not imported by any file\n');
    }

    const connections = fileData.semanticConnections || [];
    if (connections.length > 0) {
      console.log('SEMANTIC CONNECTIONS (Hidden Dependencies)');

      const byType = {};
      for (const conn of connections) {
        if (!byType[conn.type]) byType[conn.type] = [];
        byType[conn.type].push(conn);
      }

      for (const [type, conns] of Object.entries(byType)) {
        console.log(`   ${type.toUpperCase()}:`);
        for (const conn of conns.slice(0, 5)) {
          console.log(`     - ${conn.target} ${conn.key ? `(${conn.key})` : ''}`);
        }
        if (conns.length > 5) {
          console.log(`     ... and ${conns.length - 5} more`);
        }
      }
      console.log();
    }

    if (fileData.metadata) {
      const md = fileData.metadata;

      if (md.jsdocContracts?.all?.length > 0) {
        console.log('JSDoc CONTRACTS');
        console.log(`   Documented functions: ${md.jsdocContracts.all.length}`);
        for (const contract of md.jsdocContracts.all.slice(0, 3)) {
          if (contract.params?.length > 0) {
            const params = contract.params.map(p => `${p.name}: ${p.type}`).join(', ');
            console.log(`     - params: ${params}`);
          }
        }
        console.log();
      }

      if (md.asyncPatterns?.all?.length > 0) {
        console.log('ASYNC PATTERNS');
        console.log(`   Async functions: ${md.asyncPatterns.asyncFunctions?.length || 0}`);
        console.log(`   Promise chains: ${md.asyncPatterns.promiseChains?.length || 0}`);
        if (md.asyncPatterns.raceConditions?.length > 0) {
          console.log(`   Potential race conditions: ${md.asyncPatterns.raceConditions.length}`);
        }
        console.log();
      }

      if (md.errorHandling?.all?.length > 0) {
        console.log('ERROR HANDLING');
        console.log(`   Try blocks: ${md.errorHandling.tryBlocks?.length || 0}`);
        console.log(`   Custom errors: ${md.errorHandling.customErrors?.length || 0}`);
        console.log();
      }

      if (md.buildTimeDeps?.devFlags?.length > 0) {
        console.log('BUILD-TIME DEPENDENCIES');
        const flags = md.buildTimeDeps.devFlags.map(f => f.name || f.type).join(', ');
        console.log(`   Flags: ${flags}`);
        console.log();
      }
    }

    if (fileData.brokenConnections?.length > 0) {
      console.log('BROKEN CONNECTIONS');
      for (const broken of fileData.brokenConnections.slice(0, 5)) {
        console.log(`   - ${broken.type}: ${broken.reason}`);
      }
      console.log();
    }

    if (fileData.sideEffects) {
      const se = fileData.sideEffects;
      const hasSideEffects = se.hasGlobalAccess || se.usesLocalStorage ||
        se.makesNetworkCalls || se.hasEventListeners ||
        se.accessesWindow;

      if (hasSideEffects) {
        console.log('SIDE EFFECTS');
        if (se.usesLocalStorage) console.log('   - Uses localStorage/sessionStorage');
        if (se.makesNetworkCalls) console.log('   - Makes network calls');
        if (se.accessesWindow) console.log('   - Accesses window object');
        if (se.hasEventListeners) console.log('   - Adds event listeners');
        if (se.hasGlobalAccess) console.log('   - Accesses global variables');
        console.log();
      }
    }

    console.log(SEPARATOR);
    console.log('RECOMMENDATIONS\n');

    if (fileData.riskScore?.severity === 'high' || fileData.riskScore?.severity === 'critical') {
      console.log('   HIGH RISK: This file is complex and widely used.');
      console.log('      Consider splitting into smaller modules.\n');
    }

    if (fileData.usedBy?.length > 5) {
      console.log('   WIDELY USED: Changing this file affects many others.');
      console.log('      Review all dependents before making changes.\n');
    }

    if (connections.length > 0) {
      console.log('   HIDDEN CONNECTIONS: This file has semantic connections');
      console.log('      that static analysis alone would not detect.\n');
    }

    if (!fileData.usedBy || fileData.usedBy.length === 0) {
      console.log('   ORPHAN FILE: Not used by any other file.');
      if (!fileData.imports || fileData.imports.length === 0) {
        console.log('      Consider removing if truly dead code.\n');
      }
    }

    console.log(SEPARATOR + '\n');

    process.exit(0);
  } catch (error) {
    console.error('\nCheck failed:');
    console.error(`   ${error.message}\n`);
    process.exit(1);
  }
}
