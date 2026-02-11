#!/usr/bin/env node

/**
 * Auto-Configurador MCP para Claude Code, OpenCode, y VS Code
 *
 * Detecta automáticamente las ubicaciones correctas de configuración
 * y actualiza los archivos para que funcionen con OmnySys MCP Server
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = process.cwd();

// Rutas de configuración
const CONFIGS = {
  claudeCode: path.join(os.homedir(), '.config', 'claude', 'mcp_settings.json'),
  claudeCodeAlt: path.join(os.homedir(), '.claude', 'mcp_settings.json'),
  opencode: path.join(os.homedir(), '.config', 'opencode', 'opencode.json'),
  opencodeAlt: path.join(os.homedir(), '.opencode', 'opencode.json'),
  vscode: path.join(os.homedir(), '.vscode', 'settings.json'),
  vscodeGlobal: path.join(os.homedir(), 'AppData', 'Roaming', 'Code', 'User', 'settings.json')
};

function log(msg, type = 'info') {
  const icons = { info: '•', success: '✅', error: '❌', warning: '⚠️' };
  console.log(`${icons[type]} ${msg}`);
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

async function writeJsonFile(filePath, data) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Configura Claude Code CLI (usa stdio MCP)
 */
async function setupClaudeCode() {
  log('Configurando Claude Code CLI...', 'info');

  // Intentar ambas ubicaciones
  for (const configPath of [CONFIGS.claudeCode, CONFIGS.claudeCodeAlt]) {
    const dir = path.dirname(configPath);

    try {
      await fs.mkdir(dir, { recursive: true });

      const config = await readJsonFile(configPath);

      if (!config.mcpServers) config.mcpServers = {};

      config.mcpServers['omny-system'] = {
        command: 'node',
        args: [
          path.join(PROJECT_ROOT, 'src/layer-c-memory/mcp-server.js'),
          PROJECT_ROOT
        ],
        env: {
          NODE_ENV: 'production'
        }
      };

      await writeJsonFile(configPath, config);
      log(`✅ Claude Code configurado: ${configPath}`, 'success');
      return true;
    } catch (e) {
      // Intentar siguiente ubicación
    }
  }

  log('⚠️  No se pudo configurar Claude Code (no encontrado)', 'warning');
  return false;
}

/**
 * Configura OpenCode (usa stdio MCP también)
 */
async function setupOpenCode() {
  log('Configurando OpenCode...', 'info');

  for (const configPath of [CONFIGS.opencode, CONFIGS.opencodeAlt]) {
    try {
      await fs.mkdir(path.dirname(configPath), { recursive: true });

      const config = await readJsonFile(configPath);

      if (!config.mcp) config.mcp = {};

      config.mcp['omny-system'] = {
        type: 'local',
        command: ['node', path.join(PROJECT_ROOT, 'src/layer-c-memory/mcp-server.js'), PROJECT_ROOT],
        enabled: true,
        timeout: 30000,
        environment: {
          NODE_ENV: 'production'
        }
      };

      await writeJsonFile(configPath, config);
      log(`✅ OpenCode configurado: ${configPath}`, 'success');
      return true;
    } catch (e) {
      // Intentar siguiente ubicación
    }
  }

  log('⚠️  No se pudo configurar OpenCode (no encontrado)', 'warning');
  return false;
}

/**
 * Configura VS Code (si tiene extensión MCP)
 */
async function setupVSCode() {
  log('Configurando VS Code...', 'info');

  for (const configPath of [CONFIGS.vscode, CONFIGS.vscodeGlobal]) {
    if (await fileExists(configPath)) {
      try {
        const config = await readJsonFile(configPath);

        // Si tiene extensión MCP instalada
        if (config['mcp.servers'] || config['claude.mcpServers']) {
          const key = config['mcp.servers'] ? 'mcp.servers' : 'claude.mcpServers';

          if (!config[key]) config[key] = {};

          config[key]['omny-system'] = {
            command: 'node',
            args: [
              path.join(PROJECT_ROOT, 'src/layer-c-memory/mcp-server.js'),
              PROJECT_ROOT
            ]
          };

          await writeJsonFile(configPath, config);
          log(`✅ VS Code configurado: ${configPath}`, 'success');
          return true;
        }
      } catch (e) {
        // Intentar siguiente
      }
    }
  }

  log('⚠️  VS Code no configurado (extensión MCP no detectada)', 'warning');
  return false;
}

/**
 * Actualiza los archivos locales del proyecto
 */
async function updateProjectConfigs() {
  log('Actualizando configuraciones locales del proyecto...', 'info');

  // opencode.json local
  const opencodeLocal = path.join(PROJECT_ROOT, 'opencode.json');
  const configLocal = {
    "$schema": "https://opencode.ai/config.json",
    "mcp": {
      "omny-system": {
        "type": "local",
        "command": ["node", "src/layer-c-memory/mcp-server.js", PROJECT_ROOT],
        "enabled": true,
        "timeout": 30000,
        "environment": {
          "NODE_ENV": "production"
        }
      }
    }
  };

  await writeJsonFile(opencodeLocal, configLocal);
  log(`✅ ${opencodeLocal}`, 'success');

  // claude_desktop_config.json local (para referencia)
  const claudeLocal = path.join(PROJECT_ROOT, 'claude_desktop_config.json');
  const claudeConfig = {
    "mcpServers": {
      "omny-system": {
        "command": "node",
        "args": [
          "src/layer-c-memory/mcp-server.js",
          PROJECT_ROOT
        ],
        "env": {
          "NODE_ENV": "production"
        }
      }
    }
  };

  await writeJsonFile(claudeLocal, claudeConfig);
  log(`✅ ${claudeLocal}`, 'success');

  // mcp-servers.json local
  const mcpLocal = path.join(PROJECT_ROOT, 'mcp-servers.json');
  await writeJsonFile(mcpLocal, claudeConfig);
  log(`✅ ${mcpLocal}`, 'success');
}

/**
 * Muestra resumen de configuración
 */
function showSummary() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  🎉 Configuración MCP Completa                             ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║                                                            ║');
  console.log('║  Para usar OmnySys MCP:                                    ║');
  console.log('║                                                            ║');
  console.log('║  1️⃣  Claude Code CLI:                                      ║');
  console.log('║     > claude                                               ║');
  console.log('║     (MCP se conectará automáticamente)                     ║');
  console.log('║                                                            ║');
  console.log('║  2️⃣  OpenCode:                                             ║');
  console.log('║     > opencode                                             ║');
  console.log('║     (MCP se conectará automáticamente)                     ║');
  console.log('║                                                            ║');
  console.log('║  3️⃣  Terminal directo:                                     ║');
  console.log('║     > node src/layer-c-memory/mcp-server.js                ║');
  console.log('║                                                            ║');
  console.log('║  ✅ 3 terminales se abrirán automáticamente:               ║');
  console.log('║     - MCP Logs (logs en vivo)                              ║');
  console.log('║     - LLM GPU Server (puerto 8000)                         ║');
  console.log('║     - LLM CPU Server (puerto 8002) [opcional]              ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
}

async function main() {
  console.log('\n🔧 Auto-Configurador MCP para Claude Code y OpenCode\n');

  const results = {
    claudeCode: await setupClaudeCode(),
    opencode: await setupOpenCode(),
    vscode: await setupVSCode()
  };

  await updateProjectConfigs();

  console.log('\n📊 Resumen:');
  log(`Claude Code: ${results.claudeCode ? 'Configurado' : 'No encontrado'}`, results.claudeCode ? 'success' : 'warning');
  log(`OpenCode: ${results.opencode ? 'Configurado' : 'No encontrado'}`, results.opencode ? 'success' : 'warning');
  log(`VS Code: ${results.vscode ? 'Configurado' : 'No detectado'}`, results.vscode ? 'success' : 'warning');
  log('Archivos locales del proyecto: Actualizados', 'success');

  showSummary();
}

main().catch(err => {
  log(`Error: ${err.message}`, 'error');
  process.exit(1);
});
