#!/usr/bin/env node

/**
 * OmnySys Installation Script
 *
 * Automatically detects project, installs dependencies, sets up MCP server
 * No manual configuration required!
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = process.cwd();

/**
 * Installation Steps
 */
async function install() {
  console.log('🚀 OmnySys Installation\n');
  console.log('=' .repeat(60));

  // Step 1: Check if already installed
  const hasOmnySysData = await checkIfExists('.omnysysdata');
  const hasPM2Config = await checkIfExists('ecosystem.config.js');

  if (hasOmnySysData && hasPM2Config) {
    console.log('✅ OmnySys already installed\n');
    console.log('💡 The MCP server is already running');
    console.log('💡 Run: npx omny-sys mcp start .\n');
    return;
  }

  // Step 2: Install dependencies
  console.log('\n📦 Step 1: Installing dependencies...');
  await installDependencies();

  // Step 3: Create omnysysdata directory
  console.log('\n📁 Step 2: Creating .omnysysdata/...');
  await createOmnySysDataStructure();

  // Step 4: Create mcp-servers.json (auto-detection)
  console.log('\n🔧 Step 3: Creating MCP configuration...');
  await createMCPConfig();

  // Step 5: Create documentation
  console.log('\n📚 Step 4: Creating documentation...');
  await createDocumentation();

  // Step 6: Create installation script
  console.log('\n✨ Step 5: Creating installation script...');
  await createInstallScript();

  // Step 7: Verify installation
  console.log('\n🔍 Step 6: Verifying installation...');
  await verifyInstallation();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✅ OmnySys Installation Complete!\n');
  console.log('📋 What happens now:');
  console.log('   1. Start MCP server: node src/layer-c-memory/mcp-server.js .');
  console.log('   2. Use MCP tools in your AI (Claude, OpenCode, etc.)');
  console.log('   3. The server will auto-load and process your codebase');
  console.log('\n📖 Next steps:');
  console.log('   - Read: INSTALL.md (installation guide)');
  console.log('   - Read: OMNISCIENCIA.md (what we can do)');
  console.log('   - Read: MCP_SETUP.md (MCP configuration)');
  console.log('   - Start: node src/layer-c-memory/mcp-server.js .\n');
}

/**
 * Check if file/directory exists
 */
async function checkIfExists(filePath) {
  try {
    await fs.access(path.join(PROJECT_ROOT, filePath));
    return true;
  } catch {
    return false;
  }
}

/**
 * Install dependencies using npm
 */
async function installDependencies() {
  console.log('   Installing npm packages...');

  try {
    // Use npm install with --silent flag
    const { execSync } = await import('child_process');
    execSync('npm install', {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
      shell: true
    });
    console.log('   ✅ Dependencies installed');
  } catch (error) {
    console.error('   ❌ Failed to install dependencies:', error.message);
    throw error;
  }
}

/**
 * Create .omnysysdata directory structure
 */
async function createOmnySysDataStructure() {
  const dataPath = path.join(PROJECT_ROOT, '.omnysysdata');

  try {
    await fs.mkdir(dataPath, { recursive: true });

    // Create subdirectories
    await fs.mkdir(path.join(dataPath, 'files'), { recursive: true });
    await fs.mkdir(path.join(dataPath, 'connections'), { recursive: true });
    await fs.mkdir(path.join(dataPath, 'risks'), { recursive: true });

    console.log('   ✅ .omnysysdata/ structure created');
  } catch (error) {
    console.error('   ❌ Failed to create structure:', error.message);
    throw error;
  }
}

/**
 * Create mcp-servers.json for auto-detection
 */
async function createMCPConfig() {
  const config = {
    "mcpServers": {
      "omny-system": {
        "command": "node",
        "args": [
          "src/layer-c-memory/mcp-server.js",
          "."
        ],
        "description": "OmnySys - Code understanding and analysis server"
      }
    }
  };

  const configPath = path.join(PROJECT_ROOT, 'mcp-servers.json');
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');

  console.log('   ✅ mcp-servers.json created');
}

/**
 * Create documentation files
 */
async function createDocumentation() {
  const docs = [
    'INSTALL.md',
    'MCP_SETUP.md',
    'OMNISCIENCIA.md'
  ];

  for (const doc of docs) {
    const docPath = path.join(PROJECT_ROOT, doc);
    if (!await checkIfExists(doc)) {
      console.log(`   ⚠️  ${doc} not found, skipping...`);
    } else {
      console.log(`   ✅ ${doc} exists`);
    }
  }
}

/**
 * Create installation script
 */
async function createInstallScript() {
  const scriptPath = path.join(PROJECT_ROOT, 'install-omnysys.js');

  const scriptContent = `#!/usr/bin/env node

/**
 * OmnySys Installation Script
 * Runs with: node install-omnysys.js
 */

import { install } from './src/layer-c-memory/install-script.js';

install().catch(err => {
  console.error('❌ Installation failed:', err.message);
  process.exit(1);
});
`;

  try {
    await fs.writeFile(scriptPath, scriptContent, 'utf-8');
    console.log('   ✅ install-omnysys.js created');
  } catch (error) {
    console.error('   ❌ Failed to create install script:', error.message);
  }
}

/**
 * Verify installation
 */
async function verifyInstallation() {
  const checks = [
    { name: '.omnysysdata/', check: () => checkIfExists('.omnysysdata') },
    { name: 'mcp-servers.json', check: () => checkIfExists('mcp-servers.json') },
    { name: 'package.json', check: () => checkIfExists('package.json') },
    { name: 'src/layer-c-memory/mcp-server.js', check: () => checkIfExists('src/layer-c-memory/mcp-server.js') }
  ];

  console.log('   Verifying installation:');
  for (const check of checks) {
    const exists = await check.check();
    console.log(`      ${exists ? '✅' : '❌'} ${check.name}`);
  }
}

// Run installation
install().catch(err => {
  console.error('Installation failed:', err);
  process.exit(1);
});
