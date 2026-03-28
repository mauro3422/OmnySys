import { createLogger } from '../../../utils/logger.js';
import { queryToolDefinitions } from './tool-definition-query.js';
import { actionToolDefinitions } from './tool-definition-action.js';
import { adminToolDefinitions } from './tool-definition-admin.js';

const logger = createLogger('OmnySys:mcp:list_tools');

function normalizeSearchValue(value = '') {
  return String(value || '').trim().toLowerCase();
}

function buildCategoryInventory(category, definitions, options = {}) {
  const { includeSchemas = true, namePattern = '' } = options;
  const pattern = normalizeSearchValue(namePattern);

  const tools = definitions
    .filter((definition) => {
      if (!pattern) {
        return true;
      }

      return normalizeSearchValue(definition.name).includes(pattern) ||
        normalizeSearchValue(definition.description).includes(pattern);
    })
    .map((definition) => ({
      name: definition.name,
      description: definition.description,
      category,
      inputSchema: includeSchemas ? definition.inputSchema : undefined
    }));

  return {
    category,
    count: tools.length,
    tools
  };
}

export async function list_tools(args = {}) {
  const {
    category = 'all',
    includeSchemas = true,
    namePattern = ''
  } = args;

  try {
    const inventories = [
      buildCategoryInventory('query', queryToolDefinitions, { includeSchemas, namePattern }),
      buildCategoryInventory('action', actionToolDefinitions, { includeSchemas, namePattern }),
      buildCategoryInventory('admin', adminToolDefinitions, { includeSchemas, namePattern })
    ];

    const groups = category === 'all'
      ? inventories
      : inventories.filter((group) => group.category === category);

    const tools = groups.flatMap((group) => group.tools);

    return {
      success: true,
      sourceOfTruth: 'src/layer-c-memory/mcp/tools/tool-definitions.js',
      summary: {
        totalTools: tools.length,
        categories: groups.map((group) => ({
          category: group.category,
          count: group.count
        }))
      },
      groups,
      tools
    };
  } catch (error) {
    logger.error(`[Tool] list_tools failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

export default { list_tools };
