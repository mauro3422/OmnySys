#!/usr/bin/env node

/**
 * @fileoverview Terminal Setup Command
 * 
 * Configures automatic MCP daemon startup for all terminal shells.
 */

import { applyTerminalAutoStartConfig } from '../utils/mcp-standardizer/terminal-autostart.js';
import { log } from '../utils/logger.js';

export const aliases = ['terminal-setup', 'setup-terminal'];

export async function execute() {
    log('Configuring terminal auto-start for MCP daemon...', 'loading');
    
    try {
        const result = await applyTerminalAutoStartConfig();
        
        if (!result.success) {
            log('Terminal configuration completed with warnings', 'warn');
        } else {
            log('Terminal auto-start configured successfully!', 'success');
        }
        
        console.log('');
        log('Configured shells:', 'info');
        
        const configuredShells = new Set();
        for (const r of result.results) {
            if (r.applied || r.alreadyConfigured) {
                configuredShells.add(r.shell);
            }
        }
        
        for (const shell of configuredShells) {
            log(`  ✓ ${shell}`, 'success');
        }
        
        console.log('');
        log('Next steps:', 'info');
        console.log('  1. Close all terminal windows');
        console.log('  2. Open a new terminal');
        console.log('  3. The MCP daemon will start automatically');
        console.log('  4. Then you can use Qwen CLI, Claude CLI, Gemini CLI, etc.');
        
        return { success: true, result };
    } catch (error) {
        log(`Error: ${error.message}`, 'error');
        return { success: false, error: error.message };
    }
}
