/**
 * Canonical MCP tool inventory report helpers.
 */

import { queryToolDefinitions } from '../../layer-c-memory/mcp/tools/tool-definition-query.js';
import { actionToolDefinitions } from '../../layer-c-memory/mcp/tools/tool-definition-action.js';
import { adminToolDefinitions } from '../../layer-c-memory/mcp/tools/tool-definition-admin.js';

function normalizeSearchValue(value = '') {
  return String(value || '').trim().toLowerCase();
}

const TOOL_SUBGROUP_RULES = {
  action: [
    { subgroup: 'validation', patterns: ['generate_tests', 'generate_batch_tests', 'validate_imports', 'validate'] },
    { subgroup: 'migration', patterns: ['move_file', 'folderize_family', 'rename_folderized_family', 'normalize_folderized_family_names', 'consolidate_conceptual_cluster', 'folderiz', 'rename'] },
    { subgroup: 'refactoring', patterns: ['suggest_refactoring', 'suggest_architecture', 'execute_solid_split', 'detect_performance_hotspots', 'refactor', 'split'] }
  ],
  admin: [
    { subgroup: 'status', patterns: ['get_server_status', 'get_metrics_snapshot', 'get_health_snapshot', 'get_health_panel', 'get_recent_errors', 'status', 'health', 'snapshot'] },
    { subgroup: 'registry', patterns: ['get_schema', 'get_tool_inventory_report', 'list_tools', 'schema', 'inventory', 'registry'] },
    { subgroup: 'diagnostics', patterns: ['check_pipeline_integrity', 'diagnose_tool_health', 'get_technical_debt_report', 'execute_sql', 'diagnostic', 'debt', 'integrity'] }
  ],
  query: [
    { subgroup: 'graph traversal', patterns: ['traverse_graph', 'impact_atomic'] },
    { subgroup: 'aggregation', patterns: ['aggregate_metrics'] },
    { subgroup: 'point queries', patterns: ['get_atom_history', 'query_graph'] }
  ]
};

const TOOL_SUBGROUP_DEFAULTS = {
  action: 'mutation',
  admin: 'maintenance',
  query: 'inspection',
  general: 'general'
};

function classifyToolSubgroup(category, definition) {
  const text = `${normalizeSearchValue(definition.name)} ${normalizeSearchValue(definition.description)}`;
  const rules = TOOL_SUBGROUP_RULES[category] || [];

  for (const rule of rules) {
    if (rule.patterns.some((pattern) => text.includes(pattern))) {
      return rule.subgroup;
    }
  }

  return TOOL_SUBGROUP_DEFAULTS[category] || TOOL_SUBGROUP_DEFAULTS.general;
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

export function buildCompilerToolInventorySnapshot(args = {}) {
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

export function buildCompilerToolInventoryReport(snapshot) {
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

  const subgroupIndex = new Map();
  for (const group of snapshot.groups || []) {
    for (const tool of group.tools || []) {
      const subgroup = classifyToolSubgroup(group.category, tool);
      const key = `${group.category}:${subgroup}`;
      const current = subgroupIndex.get(key) || {
        category: group.category,
        subgroup,
        count: 0,
        tools: []
      };
      current.count += 1;
      current.tools.push(tool.name);
      subgroupIndex.set(key, current);
    }
  }

  const subgroupStats = Array.from(subgroupIndex.values())
    .map((entry) => ({
      ...entry,
      share: totalTools > 0 ? Math.round((entry.count / totalTools) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category) || a.subgroup.localeCompare(b.subgroup));

  const dominantCategory = categoryStats
    .slice()
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category))[0] || null;

  const dominantSubgroup = subgroupStats[0] || null;

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
    subgroupStats,
    dominantCategory,
    dominantSubgroup,
    recommendations,
    categoryConcentration: totalTools > 0 && dominantCategory
      ? Math.round((dominantCategory.count / totalTools) * 100)
      : 0,
    subgroupConcentration: totalTools > 0 && dominantSubgroup
      ? Math.round((dominantSubgroup.count / totalTools) * 100)
      : 0,
    concentration: totalTools > 0 && dominantSubgroup
      ? Math.round((dominantSubgroup.count / totalTools) * 100)
      : 0
  };
}

export default {
  buildCompilerToolInventorySnapshot,
  buildCompilerToolInventoryReport
};
