#!/usr/bin/env node

/**
 * OmnySysData Generator
 *
 * Crea la carpeta omnysysdata/ en el proyecto del usuario
 * y guarda toda la estructura de análisis + datos recolectados
 *
 * Uso:
 *   node omnysysdata-generator.js /ruta/proyecto
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const OMNYSYSDATA_DIR = '.omnysysdata';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('OmnySys:omnysysdata:generator');



/**
 * Crea la estructura omnysysdata/ en la raíz del proyecto
 */
export async function createOmnySysDataStructure(projectPath) {
  const omnysyspath = path.join(projectPath, OMNYSYSDATA_DIR);

  logger.info('📊 Creating OmnySysData structure...');
  logger.info(`   Location: ${omnysyspath}\n`);

  // Crear directorios
  const dirs = [
    omnysyspath,
    path.join(omnysyspath, 'files'),
    path.join(omnysyspath, 'connections'),
    path.join(omnysyspath, 'risks'),
    path.join(omnysyspath, 'cache'),
    path.join(omnysyspath, 'mcp-tools')
  ];

  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
    logger.info(`   ✓ ${path.relative(projectPath, dir)}/`);
  }

  logger.info('\n📝 Creating metadata files...\n');

  // 1. project-meta.json
  const projectMeta = {
    name: path.basename(projectPath),
    path: projectPath,
    createdAt: new Date().toISOString(),
    version: '1.0.0',
    omnysysDataVersion: '1.0.0',
    description: 'Project analysis and structure data'
  };

  await fs.writeFile(
    path.join(omnysyspath, 'project-meta.json'),
    JSON.stringify(projectMeta, null, 2)
  );
  logger.info('   ✓ project-meta.json');

  // 2. system-structure.json (placeholder)
  const systemStructure = {
    metadata: {
      totalFiles: 0,
      totalDependencies: 0,
      totalFunctions: 0,
      analyzedAt: new Date().toISOString()
    },
    status: 'empty',
    message: 'Awaiting analysis data from .omnysysdata/'
  };

  await fs.writeFile(
    path.join(omnysyspath, 'system-structure.json'),
    JSON.stringify(systemStructure, null, 2)
  );
  logger.info('   ✓ system-structure.json');

  // 3. README.md
  const readme = `# OmnySysData - Project Analysis Hub

## 📋 What's Inside

This directory contains all the collected system analysis data for your project.

### Directory Structure

\`\`\`
omnysysdata/
├── project-meta.json          # Project metadata
├── system-structure.json      # Complete system map
├── files/                     # Individual file analysis
│   └── *.json
├── connections/               # Connection data
│   ├── shared-state.json
│   └── event-listeners.json
├── risks/                     # Risk assessment
│   └── assessment.json
├── cache/                     # MCP Server cache
│   ├── metadata.cache
│   ├── connections.cache
│   └── files.cache
└── mcp-tools/                 # MCP tool definitions
    └── tools.json
\`\`\`

## 📊 File Descriptions

### project-meta.json
- Project name and path
- Creation timestamp
- Version information

### system-structure.json
- Complete system map from analysis
- All file relationships
- Dependencies and connections
- Risk scores

### files/
- Individual analysis for each file
- Function definitions
- Imports/exports
- Side effects

### connections/
- shared-state.json: Global state access patterns
- event-listeners.json: Event system connections

### risks/
- Risk assessment results
- Severity scoring
- File-level risk metrics

### cache/
- MCP Server runtime cache
- Frequently accessed data
- Performance optimization

### mcp-tools/
- MCP tool definitions
- Available operations
- Tool signatures

## 🔄 Data Flow

\`\`\`
Project Source Code
    ↓
Layer A (Static Analysis) → generates .omnysysdata/
    ↓
Layer B (Semantic Analysis) → enhances data
    ↓
Layer C (OmnySysData) → collects in this folder
    ↓
MCP Server → uses omnysysdata/ as source
    ↓
Claude → accesses via MCP tools
\`\`\`

## 💾 Usage

The MCP Server will automatically populate this directory with analysis data.

For local development:
\`\`\`bash
node populate-omnysysdata.js /path/to/project
\`\`\`

## ⚙️ Configuration

Edit omnysysdata.config.json to customize:
- Cache settings
- Analysis scope
- Tool definitions
- Auto-update intervals
`;

  await fs.writeFile(path.join(omnysyspath, 'README.md'), readme);
  logger.info('   ✓ README.md');

  // 4. omnysysdata.config.json
  const config = {
    version: '1.0.0',
    cache: {
      enabled: true,
      ttlMinutes: 5,
      maxSizeKB: 10240
    },
    analysis: {
      includeMetadata: true,
      includeConnections: true,
      includeRisks: true,
      includeFunctionLevel: false
    },
    mcp: {
      enabled: true,
      tools: [
        'get_impact_map',
        'analyze_change',
        'explain_connection',
        'get_risk_assessment',
        'search_files'
      ]
    },
    autoSync: {
      enabled: true,
      intervalSeconds: 60
    }
  };

  await fs.writeFile(
    path.join(omnysyspath, 'omnysysdata.config.json'),
    JSON.stringify(config, null, 2)
  );
  logger.info('   ✓ omnysysdata.config.json');

  // 5. .gitignore for cache
  const gitignore = `# OmnySysData runtime cache
cache/
*.cache
*.tmp

# Don't ignore analysis data
!project-meta.json
!system-structure.json
!connections/
!files/
!risks/
!mcp-tools/
`;

  await fs.writeFile(path.join(omnysyspath, '.gitignore'), gitignore);
  logger.info('   ✓ .gitignore');

  logger.info('\n' + '='.repeat(50));
  logger.info('✅ OmnySysData structure created successfully!');
  logger.info('='.repeat(50));
  logger.info(`\n📂 Location: omnysysdata/`);
  logger.info('\n📋 Next steps:');
  logger.info('   1. Populate with analysis data');
  logger.info('   2. Start MCP Server');
  logger.info('   3. Connect Claude Code');
  logger.info('\n');

  return omnysyspath;
}

// CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const projectPath = process.argv[2] || process.cwd();

  try {
    await createOmnySysDataStructure(projectPath);
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error:', error.message);
    process.exit(1);
  }
}
