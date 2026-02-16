import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { savePartitionedSystemMap } from '#layer-a/storage/storage-manager/files/system-map.js';
import { createDataDirectory } from '#layer-a/storage/storage-manager/setup/directory.js';

describe('storage/storage-manager/files/system-map.js', () => {
  it('writes partitioned system map artifacts', async () => {
    const root = path.join(process.cwd(), 'tmp-storage-system-map');
    await fs.rm(root, { recursive: true, force: true });
    await fs.mkdir(root, { recursive: true });
    await createDataDirectory(root);

    const out = await savePartitionedSystemMap(root, {
      metadata: { project: 'demo' },
      files: {
        'src/a.js': { exports: [], imports: [], semanticConnections: [], riskScore: { severity: 'low' } }
      },
      connections: { sharedState: [], eventListeners: [] },
      riskAssessment: { summary: { total: 0 } }
    });

    expect(out.metadata).toContain('index.json');
    expect(out.files.length).toBe(1);
    expect(out.connections.sharedStatePath).toContain('shared-state.json');
    expect(out.risks).toContain('assessment.json');

    await fs.rm(root, { recursive: true, force: true });
  });
});

