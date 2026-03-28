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

function buildInventorySnapshot(args = {}) {
  const {
    category = 'all',
    includeSchemas = true,
    namePattern = ''
  } = args;

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
}

function buildInventoryReport(snapshot) {
  const totalTools = snapshot.summary.totalTools || 0;
  const categoryStats = snapshot.summary.categories.map((entry) => {
    const share = totalTools > 0 ? Math.round((entry.count / totalTools) * 100) : 0;
    const needsSubgrouping = (entry.category === 'action' && entry.count >= 12)
      || (entry.category === 'admin' && entry.count >= 8)
      || (entry.category === 'query' && entry.count >= 8);

    return {
      ...entry,
      share,
      needsSubgrouping,
      recommendedSplit: entry.category === 'action'
        ? ['mutation', 'validation', 'refactoring', 'migration']
        : entry.category === 'admin'
          ? ['status', 'registry', 'diagnostics', 'maintenance']
          : ['point queries', 'graph traversal']
    };
  });

  const dominantCategory = categoryStats
    .slice()
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category))[0] || null;

  const recommendations = categoryStats
    .filter((entry) => entry.needsSubgrouping)
    .map((entry) => ({
      category: entry.category,
      reason: `${entry.count} tools are concentrated in the ${entry.category} bucket`,
      suggestion: entry.category === 'action'
        ? 'Split into mutation, validation, refactoring, and migration subgroups.'
        : entry.category === 'admin'
          ? 'Split into status, registry, diagnostics, and maintenance subgroups.'
          : 'Split broad query helpers into point queries and graph traversal groups.'
    }));

  return {
    categoryStats,
    dominantCategory,
    recommendations,
    concentration: totalTools > 0 && dominantCategory
      ? Math.round((dominantCategory.count / totalTools) * 100)
      : 0
  };
}

export async function list_tools(args = {}) {
  try {
    const snapshot = buildInventorySnapshot(args);
    return {
      success: true,
      ...snapshot
    };
  } catch (error) {
    logger.error(`[Tool] list_tools failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

export async function get_tool_inventory_report(args = {}) {
  try {
    const snapshot = buildInventorySnapshot(args);
    return {
      success: true,
      ...snapshot,
      report: buildInventoryReport(snapshot)
    };
  } catch (error) {
    logger.error(`[Tool] get_tool_inventory_report failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

export { buildInventorySnapshot, buildInventoryReport };

export default { list_tools, get_tool_inventory_report };
