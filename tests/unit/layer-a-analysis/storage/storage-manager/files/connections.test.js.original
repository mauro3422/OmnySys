import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { saveConnections } from '#layer-a/storage/storage-manager/files/connections.js';
import { createDataDirectory } from '#layer-a/storage/storage-manager/setup/directory.js';

describe('storage/storage-manager/files/connections.js', () => {
  it('writes shared-state and event-listener connection files', async () => {
    const root = path.join(process.cwd(), 'tmp-storage-connections');
    await fs.rm(root, { recursive: true, force: true });
    await fs.mkdir(root, { recursive: true });
    await createDataDirectory(root);

    const out = await saveConnections(root, [{ id: 1 }], [{ id: 2 }]);
    expect(out.sharedStatePath).toContain('shared-state.json');
    expect(out.eventListenersPath).toContain('event-listeners.json');
    const shared = JSON.parse(await fs.readFile(out.sharedStatePath, 'utf8'));
    expect(shared.total).toBe(1);

    await fs.rm(root, { recursive: true, force: true });
  });
});

