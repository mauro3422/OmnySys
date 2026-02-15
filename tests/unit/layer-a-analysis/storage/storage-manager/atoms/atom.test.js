import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { saveAtom, loadAtoms } from '#layer-a/storage/storage-manager/atoms/atom.js';

describe('storage/storage-manager/atoms/atom.js', () => {
  it('saves and loads atoms for a file path', async () => {
    const root = path.join(process.cwd(), 'tmp-storage-atoms');
    await fs.rm(root, { recursive: true, force: true });
    await fs.mkdir(root, { recursive: true });

    await saveAtom(root, 'src/a.js', 'fnA', { id: '1', name: 'fnA' });
    const atoms = await loadAtoms(root, 'src/a.js');
    expect(atoms.length).toBe(1);
    expect(atoms[0].name).toBe('fnA');

    await fs.rm(root, { recursive: true, force: true });
  });
});

