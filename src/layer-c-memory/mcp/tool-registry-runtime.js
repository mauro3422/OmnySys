import { pathToFileURL } from 'url';

const TOOLS_INDEX_PATH = new URL('./tools/index.js', import.meta.url).pathname
  .replace(/^\/([A-Za-z]:)/, '$1');

function toFileUrl(filePath) {
  return pathToFileURL(filePath).href;
}

const toolRegistry = { definitions: [], handlers: {} };

export function getLiveHandlers() {
  return toolRegistry.handlers;
}

export function getLiveDefinitions() {
  return toolRegistry.definitions;
}

export async function refreshToolRegistry(logger = console) {
  try {
    const url = `${toFileUrl(TOOLS_INDEX_PATH)}?bust=${Date.now()}`;
    const mod = await import(url);
    toolRegistry.definitions = mod.toolDefinitions || [];
    toolRegistry.handlers = mod.toolHandlers || {};
    logger.info(`🔄 Tool registry refreshed (${toolRegistry.definitions.length} tools)`);
  } catch (error) {
    logger.error(`❌ Failed to refresh tool registry: ${error.message}`);
  }
}
