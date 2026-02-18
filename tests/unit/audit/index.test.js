/**
 * @fileoverview Audit Index Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { auditFile, auditDirectory, runAudit } from '../../../src/audit/index.js';
import { AnalysisDataBuilder, AuditProjectBuilder, AuditTestFileBuilder } from '../../factories/audit/builders.js';

describe('auditFile', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'audit-file-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('audits a complete file', async () => {
    const data = new AnalysisDataBuilder().buildComplete();
    const filePath = path.join(tempDir, 'complete.json');
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));

    const result = await auditFile(filePath);

    expect(result.file).toContain('complete.json');
    expect(result.path).toBe(filePath);
    expect(result.hasCompleteContext).toBe(true);
    expect(result.score).toBe(100);
    expect(result.rating).toBe('EXCELLENT');
    expect(result.missingFields).toEqual([]);
  });

  it('audits an incomplete file', async () => {
    const data = new AnalysisDataBuilder()
      .missingBasicFields(['content', 'exports'])
      .build();
    const filePath = path.join(tempDir, 'incomplete.json');
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));

    const result = await auditFile(filePath);

    expect(result.hasCompleteContext).toBe(false);
    expect(result.missingFields).toContain('content');
    expect(result.missingFields).toContain('exports');
    expect(result.score).toBeLessThan(100);
  });

  it('returns error for invalid JSON', async () => {
    const filePath = path.join(tempDir, 'invalid.json');
    await fs.writeFile(filePath, '{ invalid json }');

    const result = await auditFile(filePath);

    expect(result.error).toBeDefined();
    expect(result.hasCompleteContext).toBe(false);
    expect(result.score).toBe(0);
    expect(result.file).toBe('invalid.json');
  });

  it('returns error for non-existent file', async () => {
    const result = await auditFile(path.join(tempDir, 'nonexistent.json'));

    expect(result.error).toBeDefined();
    expect(result.hasCompleteContext).toBe(false);
    expect(result.score).toBe(0);
  });

  it('handles empty JSON file', async () => {
    const filePath = path.join(tempDir, 'empty.json');
    await fs.writeFile(filePath, '{}');

    const result = await auditFile(filePath);

    expect(result.file).toContain('empty.json');
    expect(result.hasCompleteContext).toBe(false);
    expect(result.missingFields.length).toBeGreaterThan(0);
  });

  it('audits file with only basic fields', async () => {
    const data = new AnalysisDataBuilder().buildMinimal();
    const filePath = path.join(tempDir, 'basic.json');
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));

    const result = await auditFile(filePath);

    expect(result.missingFields).toEqual([]);
    expect(result.hasCompleteContext).toBe(true);
    expect(result.score).toBe(100);
  });

  it('audits file with all field categories', async () => {
    const data = new AnalysisDataBuilder()
      .withCompleteMetadata()
      .withCompleteAnalysis()
      .withCompleteQuality()
      .withPartialSemantic(['connections'])
      .build();
    const filePath = path.join(tempDir, 'partial-semantic.json');
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));

    const result = await auditFile(filePath);

    expect(result.missingFields).toContain('semantic.connections');
    expect(result.hasCompleteContext).toBe(false);
  });
});

describe('auditDirectory', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'audit-dir-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('audits multiple JSON files', async () => {
    const builder = AuditTestFileBuilder.create(tempDir);
    builder
      .addJsonFile('file1.json', new AnalysisDataBuilder().buildComplete())
      .addJsonFile('file2.json', new AnalysisDataBuilder().missingBasicFields(['content']).build());
    await builder.write();

    const result = await auditDirectory(tempDir);

    expect(result.files).toHaveLength(2);
    expect(result.summary.total).toBe(2);
    expect(result.summary.complete).toBe(1);
    expect(result.summary.incomplete).toBe(1);
  });

  it('ignores non-JSON files', async () => {
    await fs.writeFile(path.join(tempDir, 'file1.json'), '{}');
    await fs.writeFile(path.join(tempDir, 'file2.txt'), 'text');
    await fs.writeFile(path.join(tempDir, 'file3.md'), '# markdown');

    const result = await auditDirectory(tempDir);

    expect(result.files).toHaveLength(1);
    expect(result.summary.total).toBe(1);
  });

  it('returns empty for directory with no JSON files', async () => {
    await fs.writeFile(path.join(tempDir, 'file.txt'), 'text');

    const result = await auditDirectory(tempDir);

    expect(result.files).toHaveLength(0);
    expect(result.summary.total).toBe(0);
  });

  it('returns empty for empty directory', async () => {
    const result = await auditDirectory(tempDir);

    expect(result.files).toHaveLength(0);
    expect(result.summary.total).toBe(0);
  });

  it('handles custom pattern', async () => {
    await fs.writeFile(path.join(tempDir, 'data.atom.json'), '{}');
    await fs.writeFile(path.join(tempDir, 'data.molecule.json'), '{}');
    await fs.writeFile(path.join(tempDir, 'other.json'), '{}');

    const result = await auditDirectory(tempDir, { pattern: /\.atom\.json$/ });

    expect(result.files).toHaveLength(1);
    expect(result.files[0].file).toContain('data.atom.json');
  });

  it('handles mixed valid and invalid files', async () => {
    const validData = {
      id: 'test',
      path: 'test.js',
      name: 'test',
      content: 'code',
      exports: [],
      imports: [],
      dependencies: [],
      dependents: []
    };
    await fs.writeFile(path.join(tempDir, 'valid.json'), JSON.stringify(validData, null, 2));
    await fs.writeFile(path.join(tempDir, 'invalid.json'), '{ broken');

    const result = await auditDirectory(tempDir);

    expect(result.files).toHaveLength(2);
    expect(result.summary.complete).toBe(1);
    expect(result.summary.incomplete).toBe(1);
  });
});

describe('runAudit', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'run-audit-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('returns empty for project without .omnysysdata', async () => {
    const result = await runAudit(tempDir);

    expect(result.atoms.files).toHaveLength(0);
    expect(result.molecules.files).toHaveLength(0);
    expect(result.summary.total).toBe(0);
  });

  it('audits atoms and molecules', async () => {
    const projectBuilder = AuditProjectBuilder.create(tempDir);
    projectBuilder
      .addAtom(new AnalysisDataBuilder().withName('atom1').buildComplete(), 'atom1')
      .addAtom(new AnalysisDataBuilder().withName('atom2').missingBasicFields(['content']).build(), 'atom2')
      .addMolecule({
        id: 'src/test.js',
        path: 'src/test.js',
        name: 'test',
        exports: [],
        imports: [],
        dependencies: [],
        dependents: []
      }, 'test-molecule');
    await projectBuilder.write();

    const result = await runAudit(tempDir);

    expect(result.atoms.files).toHaveLength(2);
    expect(result.molecules.files).toHaveLength(1);
    expect(result.summary.total).toBe(3);
  });

  it('handles missing atoms directory', async () => {
    const projectBuilder = AuditProjectBuilder.create(tempDir);
    projectBuilder.addMolecule({
      id: 'src/test.js',
      path: 'src/test.js',
      name: 'test',
      exports: [],
      imports: [],
      dependencies: [],
      dependents: []
    }, 'test');
    await projectBuilder.write();

    const result = await runAudit(tempDir);

    expect(result.atoms.files).toHaveLength(0);
    expect(result.molecules.files).toHaveLength(1);
  });

  it('handles missing molecules directory', async () => {
    const projectBuilder = AuditProjectBuilder.create(tempDir);
    projectBuilder.addAtom(new AnalysisDataBuilder().buildComplete(), 'atom1');
    await projectBuilder.write();
    const atomsDir = path.join(tempDir, '.omnysysdata', 'atoms');
    await fs.rm(path.join(tempDir, '.omnysysdata', 'molecules'), { recursive: true, force: true }).catch(() => {});

    const result = await runAudit(tempDir);

    expect(result.atoms.files).toHaveLength(1);
    expect(result.molecules.files).toHaveLength(0);
  });

  it('calculates overall summary', async () => {
    const projectBuilder = AuditProjectBuilder.create(tempDir);
    projectBuilder
      .addAtom(new AnalysisDataBuilder().withName('complete').buildComplete(), 'complete')
      .addAtom(new AnalysisDataBuilder().withName('incomplete').missingBasicFields(['content', 'exports']).build(), 'incomplete');
    await projectBuilder.write();

    const result = await runAudit(tempDir);

    expect(result.summary.total).toBe(2);
    expect(result.summary.complete).toBe(1);
    expect(result.summary.incomplete).toBe(1);
    expect(result.summary.completeness).toBe(50);
  });
});
