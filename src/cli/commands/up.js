import { checkLLM, checkMCP, PORTS } from '../utils/port-checker.js';
import { setupOpenCode } from '../utils/opencode-config.js';
import { log } from '../utils/logger.js';
import { startLLM, startMCP } from '../handlers/process-manager.js';

export const aliases = ['start', 'up'];

export async function upLogic(options = {}) {
  const { silent = false } = options;

  try {
    let llmRunning = false;
    let llmStarted = false;

    let mcpRunning = await checkMCP();
    let mcpStarted = false;

    if (mcpRunning) {
      const isClean = process.argv.includes('--clean');
      log('\n♻️  The MCP HTTP Daemon is ALREADY RUNNING.', 'info');
      log(`📡 Sending graceful restart signal to Daemon instead of killing it (clearCache=${isClean})...`, 'info');

      try {
        const response = await fetch(`http://127.0.0.1:${PORTS.mcp}/restart`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clearCache: isClean, reanalyze: isClean })
        });

        if (response.ok) {
          const data = await response.json();
          log(`✅ Daemon graceful restart triggered: ${data.message || 'OK'}`, 'success');
          mcpStarted = true;
        } else {
          log(`⚠️ Daemon rejected internal restart (Status ${response.status})`, 'warn');
        }
      } catch (err) {
        log(`❌ Failed to send restart signal: ${err.message}`, 'error');
      }
    }

    if (!mcpRunning) {
      mcpStarted = true;
      mcpRunning = await startMCP();
    }

    if (!mcpRunning) {
      return {
        success: false,
        exitCode: 1,
        error: 'MCP Server failed to start',
        services: {
          llm: { running: true, started: llmStarted, port: PORTS.llm },
          mcp: { running: false, started: mcpStarted }
        }
      };
    }

    const configured = await setupOpenCode();

    return {
      success: true,
      exitCode: 0,
      services: {
        llm: { running: true, started: llmStarted, port: PORTS.llm },
        mcp: { running: true, started: mcpStarted, port: PORTS.mcp }
      },
      openCodeConfigured: configured
    };
  } catch (error) {
    return {
      success: false,
      exitCode: 1,
      error: error.message
    };
  }
}

export async function execute() {
  log('Starting OmnySys...', 'loading');

  const result = await upLogic();

  if (!result.success) {
    log(result.error, 'error');
    return;
  }

  // LLM Server check removed since it is deprecated

  if (result.services.mcp.started) {
    log(`MCP Server ready on port ${result.services.mcp.port}`, 'success');
  } else {
    log(`MCP Server already running on port ${result.services.mcp.port}`, 'success');
  }

  log('\nOmnySys is ready', 'success');
  log(`   MCP:  http://localhost:${result.services.mcp.port}/health`);
  log(`   Tools: http://localhost:${result.services.mcp.port}/tools\n`);

  if (result.openCodeConfigured) {
    log('Unified MCP client configuration applied', 'success');
  }
}
