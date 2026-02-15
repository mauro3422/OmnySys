import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { saveMolecule, loadMolecule } from '#layer-a/storage/storage-manager/molecules/molecule.js';

describe('storage/storage-manager/molecules/molecule.js', () => {
  it('saves and loads molecule payload for a file path', async () => {
    const root = path.join(process.cwd(), 'tmp-storage-molecules');
    await fs.rm(root, { recursive: true, force: true });
    await fs.mkdir(root, { recursive: true });

    await saveMolecule(root, 'src/a.js', { atoms: [{ id: 1 }], derivations: [] });
    const molecule = await loadMolecule(root, 'src/a.js');
    expect(molecule).toBeTruthy();
    expect(Array.isArray(molecule.atoms)).toBe(true);

    await fs.rm(root, { recursive: true, force: true });
  });
});

