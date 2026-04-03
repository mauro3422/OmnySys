import { describe, expect, it } from 'vitest';

import { buildInventoryReport } from '../../../../../src/layer-c-memory/mcp/tools/list-tools.js';

describe('list tools inventory report', () => {
  it('exposes subgroup concentration alongside the category concentration', () => {
    const report = buildInventoryReport({
      summary: {
        totalTools: 9,
        categories: [
          { category: 'query', count: 2 },
          { category: 'action', count: 4 },
          { category: 'admin', count: 3 }
        ]
      },
      groups: [
        {
          category: 'query',
          tools: [
            { name: 'mcp_omnysystem_query_graph', description: 'query graph' },
            { name: 'mcp_omnysystem_traverse_graph', description: 'traverse graph' }
          ]
        },
        {
          category: 'action',
          tools: [
            { name: 'mcp_omnysystem_atomic_edit', description: 'atomic edit' },
            { name: 'mcp_omnysystem_atomic_write', description: 'atomic write' },
            { name: 'mcp_omnysystem_generate_tests', description: 'generate tests' },
            { name: 'mcp_omnysystem_validate_imports', description: 'validate imports' }
          ]
        },
        {
          category: 'admin',
          tools: [
            { name: 'mcp_omnysystem_get_server_status', description: 'status' },
            { name: 'mcp_omnysystem_get_recent_errors', description: 'errors' },
            { name: 'mcp_omnysystem_get_schema', description: 'schema' }
          ]
        }
      ]
    });

    expect(report.categoryConcentration).toBe(44);
    expect(report.concentration).toBeLessThan(report.categoryConcentration);
    expect(report.dominantSubgroup).toMatchObject({
      category: 'action'
    });
    expect(report.subgroupStats.length).toBeGreaterThan(0);
  });
});
