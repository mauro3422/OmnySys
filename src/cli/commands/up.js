import { checkLLM, checkMCP, PORTS } from '../utils/port-checker.js';
import { setupOpenCode } from '../utils/opencode-config.js';
import { log } from '../utils/logger.js';
import { startLLM, startMCP } from '../handlers/process-manager.js';

export const aliases = ['start', 'up'];

export async function upLogic(options = {}) {
  const { silent = false } = options;

  try {
    let llmRunning = await checkLLM();
    let llmStarted = false;

    if (!llmRunning) {
      llmStarted = true;
      llmRunning = await startLLM();
    }

    if (!llmRunning) {
      return {
        success: false,
        exitCode: 1,
        error: 'LLM Server failed to start',
        services: {
          llm: { running: false, started: llmStarted },
          mcp: { running: false, started: false }
        }
      };
    }

    let mcpRunning = await checkMCP();
    let mcpStarted = false;

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
  log('Iniciando OmnySys...', 'loading');
  
  const result = await upLogic();
  
  if (!result.success) {
    log(result.error, 'error');
    return;
  }
  
  if (result.services.llm.started) {
    log(`LLM Server ready on port ${result.services.llm.port}`, 'success');
  } else {
    log(`LLM Server already running on port ${result.services.llm.port}`, 'success');
  }
  
  if (result.services.mcp.started) {
    log(`MCP Server ready on port ${result.services.mcp.port}`, 'success');
  } else {
    log(`MCP Server already running on port ${result.services.mcp.port}`, 'success');
  }
  
  log('\n🚀 OmnySys está listo!', 'success');
  log(`   LLM:  http://localhost:${result.services.llm.port}/health`);
  log(`   MCP:  http://localhost:${result.services.mcp.port}/health`);
  log(`   Tools: http://localhost:${result.services.mcp.port}/tools\n`);
  
  if (result.openCodeConfigured) {
    log('OpenCode configurado automáticamente', 'success');
  }
}
