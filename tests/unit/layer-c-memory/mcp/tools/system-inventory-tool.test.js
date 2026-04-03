import { describe, expect, it } from 'vitest';

import { adminToolDefinitions } from '../../../../../src/layer-c-memory/mcp/tools/tool-definition-admin.js';
import { adminToolHandlers } from '../../../../../src/layer-c-memory/mcp/tools/tool-handler-admin.js';

describe('system inventory tool wiring', () => {
  it('registers the dedicated system inventory report tool', () => {
    expect(adminToolDefinitions.some((tool) => tool.name === 'mcp_omnysystem_get_system_inventory_report')).toBe(true);
    expect(typeof adminToolHandlers.mcp_omnysystem_get_system_inventory_report).toBe('function');
  });
});
