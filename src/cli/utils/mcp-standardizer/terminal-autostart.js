import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

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
    // Normalize path for the shell
    let normalizedPath = entryPath;
    
    if (shell === 'powershell' || shell === 'pwsh') {
        // PowerShell uses backslashes on Windows
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
    } else {
        // Bash/Zsh use forward slashes even on Windows (via WSL or Git Bash)
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
            
            // Ensure directory exists
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
    const projectPath = path.resolve(options.projectPath || process.cwd());
    
    // Find the autostart script
    let scriptPath = getAutostartScriptPath();
    
    // Normalize path for the current platform
    if (process.platform === 'win32') {
        scriptPath = scriptPath.replace(/\//g, '\\');
        // Ensure proper Windows absolute path
        if (!/^[a-zA-Z]:/.test(scriptPath)) {
            scriptPath = path.resolve(scriptPath);
        }
    }

    const allResults = [];

    // Apply to all shell types
    for (const shell of Object.keys(SHELL_PROFILES)) {
        const results = await applyShellConfig(shell, scriptPath);
        allResults.push(...results);
    }

    const success = allResults.some(r => r.applied || r.alreadyConfigured);

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
    const scriptName = 'omny.js';
    const allResults = [];

    for (const [shell, profiles] of Object.entries(SHELL_PROFILES)) {
        for (const profilePath of profiles) {
            try {
                const content = await getProfileContent(profilePath);
                
                if (!hasAutoStartConfig(content, scriptName)) {
                    allResults.push({
                        shell,
                        profile: profilePath,
                        removed: false,
                        notConfigured: true
                    });
                    continue;
                }

                // Remove the auto-start configuration
                const lines = content.split('\n');
                const filteredLines = [];
                let inOmnyBlock = false;

                for (const line of lines) {
                    if (line.includes('OmnySys MCP Auto-Start')) {
                        inOmnyBlock = true;
                        continue;
                    }
                    if (inOmnyBlock && (line.startsWith('fi') || line.startsWith('}'))) {
                        inOmnyBlock = false;
                        continue;
                    }
                    if (!inOmnyBlock && !line.includes('omny_cli') && !line.includes('omnyCli') && !line.includes('mcp-autostart') && !line.includes('omny.js')) {
                        filteredLines.push(line);
                    }
                }

                await fs.writeFile(profilePath, filteredLines.join('\n'), 'utf8');
                
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
        success: allResults.some(r => r.removed),
        results: allResults
    };
}
