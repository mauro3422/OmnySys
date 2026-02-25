import { setupOpenCode, getOpenCodeConfigPath } from '../utils/opencode-config.js';
import { PORTS } from '../utils/port-checker.js';
import { log } from '../utils/logger.js';

export const aliases = ['setup'];

export async function setupLogic(options = {}) {
  const { silent = false } = options;

  try {
    const configured = await setupOpenCode();

    if (configured) {
      return {
        success: true,
        exitCode: 0,
        configured: true,
        config: {
          llmPort: PORTS.llm,
          mcpPort: PORTS.mcp,
          configPath: getOpenCodeConfigPath()
        }
      };
    }

    return {
      success: false,
      exitCode: 1,
      configured: false,
      error: 'Could not configure OpenCode automatically'
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
  log('Configuring OmnySys...', 'loading');
  const result = await setupLogic();

  if (result.success) {
    log('\nConfiguration complete', 'success');
    log('   MCP clients: configured');
    log(`   LLM Port: ${result.config.llmPort}`);
    log(`   MCP Port: ${result.config.mcpPort}`);
    log(`   OpenCode config: ${result.config.configPath}`);
    return;
  }

  log('Could not configure MCP clients automatically', 'warning');
}
