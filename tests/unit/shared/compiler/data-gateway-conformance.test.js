import { describe, expect, it } from 'vitest';

import { detectDataGatewayConformanceFromSource } from '../../../../src/shared/compiler/data-gateway-conformance.js';

describe('data gateway conformance', () => {
  it('does not flag governance and diagnostic surfaces as policy drift', () => {
    const diagnosticFiles = [
      'src/layer-c-memory/mcp/core/governance-alerts.js',
      'src/layer-c-memory/mcp/tools/detect-db-access.js',
      'src/layer-c-memory/mcp/tools/handlers/pipeline-health-domain/metadata-health.js',
      'src/layer-c-memory/mcp/tools/handlers/pipeline-health-handler.js',
      'src/core/file-watcher/guards/pipeline-orphan/reporting-payload.js',
      'src/layer-c-memory/query/queries/file-query/system-map.js'
    ];

    for (const filePath of diagnosticFiles) {
      const source = [
        "import { getRepository } from '#layer-c/storage/repository/index.js';",
        'const db = getRepository(projectPath).db;',
        "const row = db.prepare('SELECT * FROM system_files WHERE path = ?').get(filePath);"
      ].join('\n');

      expect(detectDataGatewayConformanceFromSource(filePath, source)).toHaveLength(0);
    }
  });
});
