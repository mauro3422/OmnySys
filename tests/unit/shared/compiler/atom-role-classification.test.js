import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  classifyAtomOperationalRole,
  classifyFileOperationalRole
} from '../../../../src/shared/compiler/atom-role-classification.js';

describe('atom-role-classification', () => {
  describe('classifyAtomOperationalRole', () => {
    it('classifies bridge role from path', () => {
      const result = classifyAtomOperationalRole(
        { name: 'bridge', file_path: 'src/layer-c-memory/mcp-stdio-bridge.js' },
        { filePath: 'src/layer-c-memory/mcp-stdio-bridge.js' }
      );
      assert.strictEqual(result.role, 'bridge');
      assert.ok(result.confidence >= 0.9);
      assert.ok(result.reasons.includes('runtime_bridge_path'));
    });

    it('classifies orchestrator role from archetype', () => {
      const result = classifyAtomOperationalRole(
        { name: 'main', archetype_type: 'orchestrator', file_path: 'src/core/orchestrator.js' },
        { filePath: 'src/core/orchestrator.js' }
      );
      assert.strictEqual(result.role, 'orchestrator');
      assert.ok(result.confidence >= 0.85);
    });

    it('classifies policy role from compiler path', () => {
      const result = classifyAtomOperationalRole(
        { name: 'check', file_path: 'src/shared/compiler/compiler-policy.js' },
        { filePath: 'src/shared/compiler/compiler-policy.js' }
      );
      assert.strictEqual(result.role, 'policy');
      assert.ok(result.confidence >= 0.85);
    });

    it('classifies storage role from repository path', () => {
      const result = classifyAtomOperationalRole(
        { name: 'save', file_path: 'src/layer-c-memory/storage/repository/index.js' },
        { filePath: 'src/layer-c-memory/storage/repository/index.js' }
      );
      assert.strictEqual(result.role, 'storage');
      assert.ok(result.confidence >= 0.85);
    });

    it('classifies adapter role from network calls', () => {
      const result = classifyAtomOperationalRole(
        { name: 'fetch', has_network_calls: true, archetype_type: 'adapter' },
        { filePath: 'src/adapters/api-client.js' }
      );
      assert.strictEqual(result.role, 'adapter');
    });

    it('classifies transformer role from naming', () => {
      const result = classifyAtomOperationalRole(
        { name: 'normalizeAtomKind', archetype_type: 'mapper' },
        { filePath: 'src/utils/normalize.js' }
      );
      assert.strictEqual(result.role, 'transformer');
      assert.ok(result.confidence >= 0.8);
    });

    it('returns standard as default', () => {
      const result = classifyAtomOperationalRole(
        { name: 'helper', file_path: 'src/utils/helper.js' },
        { filePath: 'src/utils/helper.js' }
      );
      assert.strictEqual(result.role, 'standard');
      assert.strictEqual(result.confidence, 0.45);
    });

    it('boosts confidence with shared state access', () => {
      const result = classifyAtomOperationalRole(
        { name: 'helper', file_path: 'src/utils/helper.js', sharedStateAccess: [{ scopeType: 'module' }] },
        { filePath: 'src/utils/helper.js' }
      );
      assert.ok(result.confidence >= 0.78);
      assert.ok(result.reasons.includes('shared_state_access'));
    });
  });

  describe('classifyFileOperationalRole', () => {
    it('classifies bridge from file path', () => {
      const result = classifyFileOperationalRole('src/layer-c-memory/mcp-http-proxy.js');
      assert.strictEqual(result.role, 'bridge');
      assert.ok(result.confidence >= 0.9);
    });

    it('classifies builder from path', () => {
      const result = classifyFileOperationalRole('src/layer-a-static/pipeline/phases/atom-extraction/builders/enrichment.js');
      assert.strictEqual(result.role, 'builder');
    });

    it('classifies storage from path', () => {
      const result = classifyFileOperationalRole('src/layer-c-memory/storage/repository/adapters/operations.js');
      assert.strictEqual(result.role, 'storage');
    });

    it('returns standard for generic utility paths', () => {
      const result = classifyFileOperationalRole('src/utils/helpers.js');
      assert.strictEqual(result.role, 'standard');
    });
  });
});
