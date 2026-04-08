import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { stripTerminalAutoStartConfig } from './terminal-autostart-helpers.js';

const homeDir = os.homedir();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Terminal profile paths for different shells
 */
const SHELL_PROFILES = {
  bash: [
    path.join(homeDir, '.bashrc'),
    path.join(homeDir, '.bash_profile')
  ],
  zsh: [
    path.join(homeDir, '.zshrc')
  ],
  powershell: [
    path.join(homeDir, 'Documents', 'PowerShell', 'Microsoft.PowerShell_profile.ps1'),
    path.join(homeDir, '.config', 'powershell', 'Microsoft.PowerShell_profile.ps1')
  ],
  pwsh: [
    path.join(homeDir, 'Documents', 'PowerShell', 'Microsoft.PowerShell_profile.ps1'),
    path.join(homeDir, '.config', 'powershell', 'Microsoft.PowerShell_profile.ps1')
  ]
};

/**
 * Get the path to the OmnySys CLI entrypoint used for terminal auto-start.
 */
export function getAutostartScriptPath() {
  const repoRoot = path.resolve(__dirname, '../../../..');
  return path.join(repoRoot, 'omny.js');
}

/**
 * Get the shell profile content
 */
async function getProfileContent(profilePath) {
  try {
    return await fs.readFile(profilePath, 'utf8');
  } catch {
    return '';
  }
}

/**
 * Check if auto-start is already configured in a profile
 */
function hasAutoStartConfig(content, entryPath) {
  const normalized = String(entryPath || '').replace(/\\/g, '/');
  return content.includes(normalized)
    || content.includes('omny.js')
    || content.includes('omny.js" up')
    || content.includes('omny.js\' up')
    || content.includes('omny.js up')
    || content.includes('mcp-autostart');
}

/**
 * Add auto-start configuration to a shell profile
 */
export function addAutoStartConfig(content, entryPath, shell) {
  let normalizedPath = entryPath;

  if (shell === 'powershell' || shell === 'pwsh') {
    normalizedPath = entryPath.replace(/\//g, '\\');

    const config = `
# OmnySys MCP Auto-Start
# Ensures MCP daemon is running when terminal opens
$omnyCli = "${normalizedPath}"
if (Test-Path $omnyCli) {
    Start-Process node -ArgumentList @($omnyCli, 'up') -WindowStyle Hidden
}
`;
    return content + config;
  }

  normalizedPath = entryPath.replace(/\\/g, '/');

  const config = `
# OmnySys MCP Auto-Start
# Ensures MCP daemon is running when terminal opens
omny_cli="${normalizedPath}"
if [ -f "$omny_cli" ]; then
    node "$omny_cli" up > /dev/null 2>&1 &
fi
`;
  return content + config;
}

/**
 * Apply auto-start configuration to a specific shell profile
 */
async function applyShellConfig(shell, entryPath) {
  const profiles = SHELL_PROFILES[shell] || [];
  const results = [];

  for (const profilePath of profiles) {
    try {
      const content = await getProfileContent(profilePath);

      if (hasAutoStartConfig(content, entryPath)) {
        results.push({
          shell,
          profile: profilePath,
          applied: false,
          alreadyConfigured: true
        });
        continue;
      }

      const updatedContent = addAutoStartConfig(content, entryPath, shell);

      await fs.mkdir(path.dirname(profilePath), { recursive: true });
      await fs.writeFile(profilePath, updatedContent, 'utf8');

      results.push({
        shell,
        profile: profilePath,
        applied: true
      });
    } catch (error) {
      results.push({
        shell,
        profile: profilePath,
        applied: false,
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Apply auto-start configuration to all supported shells
 */
export async function applyTerminalAutoStartConfig(options = {}) {
  let scriptPath = getAutostartScriptPath();

  if (process.platform === 'win32') {
    scriptPath = scriptPath.replace(/\//g, '\\');

    if (!/^[a-zA-Z]:/.test(scriptPath)) {
      scriptPath = path.resolve(scriptPath);
    }
  }

  const allResults = [];

  for (const shell of Object.keys(SHELL_PROFILES)) {
    const results = await applyShellConfig(shell, scriptPath);
    allResults.push(...results);
  }

  const success = allResults.some((r) => r.applied || r.alreadyConfigured);

  return {
    success,
    scriptPath,
    results: allResults
  };
}

/**
 * Remove auto-start configuration from shell profiles
 */
export async function removeTerminalAutoStartConfig() {
  const allResults = [];

  for (const [shell, profiles] of Object.entries(SHELL_PROFILES)) {
    for (const profilePath of profiles) {
      try {
        const content = await getProfileContent(profilePath);
        const updatedContent = stripTerminalAutoStartConfig(content);

        if (updatedContent === content) {
          allResults.push({
            shell,
            profile: profilePath,
            removed: false,
            notConfigured: true
          });
          continue;
        }

        await fs.writeFile(profilePath, updatedContent, 'utf8');

        allResults.push({
          shell,
          profile: profilePath,
          removed: true
        });
      } catch (error) {
        allResults.push({
          shell,
          profile: profilePath,
          removed: false,
          error: error.message
        });
      }
    }
  }

  return {
    success: allResults.some((r) => r.removed),
    results: allResults
  };
}
