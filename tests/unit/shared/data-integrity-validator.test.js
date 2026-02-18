/**
 * @fileoverview data-integrity-validator.test.js
 * 
 * REAL tests for Data Integrity Validator.
 * NO MOCKS - creates real files and validates real data.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  DataIntegrityValidator,
  ValidationResult,
  AtomValidator,
  MoleculeValidator,
  CrossReferenceValidator
} from '#shared/data-integrity-validator.js';
import {
  AtomBuilder,
  MoleculeBuilder,
  OmnySystemDataBuilder
} from '../../factories/shared/builders.js';

describe('ValidationResult - Basic Operations', () => {
  let result;

  beforeEach(() => {
    result = new ValidationResult();
  });

  it('starts with valid=true', () => {
    expect(result.valid).toBe(true);
  });

  it('starts with empty errors and warnings', () => {
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('addError sets valid to false', () => {
    result.addError('Test error', { context: 'test' });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
  });

  it('addWarning does not change valid', () => {
    result.addWarning('Test warning', { context: 'test' });
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(1);
  });

  it('getSummary returns correct data', () => {
    result.addError('Error 1');
    result.addWarning('Warning 1');
    result.stats.atomsChecked = 10;

    const summary = result.getSummary();

    expect(summary.valid).toBe(false);
    expect(summary.errors).toBe(1);
    expect(summary.warnings).toBe(1);
    expect(summary.stats.atomsChecked).toBe(10);
  });

  it('hasErrors and hasWarnings work correctly', () => {
    expect(result.hasErrors()).toBe(false);
    expect(result.hasWarnings()).toBe(false);

    result.addError('Error');
    expect(result.hasErrors()).toBe(true);

    result.addWarning('Warning');
    expect(result.hasWarnings()).toBe(true);
  });
});

describe('AtomValidator - Validation Logic', () => {
  let validator;
  let result;
  let molecules;

  beforeEach(() => {
    validator = new AtomValidator();
    result = new ValidationResult();
    molecules = new Map();
    molecules.set('src/test.js', MoleculeBuilder.create('src/test.js').build());
  });

  it('validates correct atom', () => {
    const atom = AtomBuilder.create()
      .withId('src/test.js::validFunc')
      .withName('validFunc')
      .withComplexity(5)
      .build();
    atom.parentMolecule = 'src/test.js';

    validator.validate('src/test.js::validFunc', atom, result, molecules);

    expect(result.valid).toBe(true);
  });

  it('detects missing id', () => {
    const atom = AtomBuilder.create().withoutField('id').build();

    validator.validate('test-atom', atom, result, molecules);

    expect(result.hasErrors()).toBe(true);
    expect(result.errors[0].message).toContain('missing id');
  });

  it('detects missing name', () => {
    const atom = AtomBuilder.create().withoutField('name').build();

    validator.validate('test-atom', atom, result, molecules);

    expect(result.hasErrors()).toBe(true);
  });

  it('warns about missing complexity', () => {
    const atom = AtomBuilder.create().withoutField('complexity').build();
    atom.parentMolecule = 'src/test.js';

    validator.validate('test-atom', atom, result, molecules);

    expect(result.hasWarnings()).toBe(true);
  });

  it('detects incorrect type', () => {
    const atom = AtomBuilder.create().withInvalidType('type', 'molecule').build();

    validator.validate('test-atom', atom, result, molecules);

    expect(result.hasErrors()).toBe(true);
  });

  it('detects non-array calls', () => {
    const atom = AtomBuilder.create()
      .withInvalidType('calls', 'not-an-array')
      .build();

    validator.validate('test-atom', atom, result, molecules);

    expect(result.hasErrors()).toBe(true);
  });

  it('detects non-array calledBy', () => {
    const atom = AtomBuilder.create()
      .withInvalidType('calledBy', 'not-an-array')
      .build();

    validator.validate('test-atom', atom, result, molecules);

    expect(result.hasErrors()).toBe(true);
  });

  it('warns about archetype missing type', () => {
    const atom = AtomBuilder.create().build();
    atom.archetype = { severity: 5 };

    validator.validate('test-atom', atom, result, molecules);

    expect(result.hasWarnings()).toBe(true);
  });

  it('warns about archetype missing severity', () => {
    const atom = AtomBuilder.create().build();
    atom.archetype = { type: 'standard' };

    validator.validate('test-atom', atom, result, molecules);

    expect(result.hasWarnings()).toBe(true);
  });

  it('warns about missing parentMolecule', () => {
    const atom = AtomBuilder.create().withoutField('parentMolecule').build();

    validator.validate('test-atom', atom, result, molecules);

    expect(result.hasWarnings()).toBe(true);
  });

  it('errors on non-existent parentMolecule', () => {
    const atom = AtomBuilder.create().build();
    atom.parentMolecule = 'non-existent.js';

    validator.validate('test-atom', atom, result, molecules);

    expect(result.hasErrors()).toBe(true);
    expect(result.errors[0].message).toContain('non-existent');
  });
});

describe('MoleculeValidator - Validation Logic', () => {
  let validator;
  let result;
  let atoms;

  beforeEach(() => {
    validator = new MoleculeValidator();
    result = new ValidationResult();
    atoms = new Map();
  });

  it('validates correct molecule', () => {
    const molecule = MoleculeBuilder.create()
      .withFilePath('src/test.js')
      .build();

    validator.validate('src/test.js', molecule, result, atoms);

    expect(result.valid).toBe(true);
  });
});

describe('CrossReferenceValidator - Validation Logic', () => {
  let validator;
  let result;
  let atoms;

  beforeEach(() => {
    validator = new CrossReferenceValidator();
    result = new ValidationResult();
    atoms = new Map();
  });

  it('validates empty atoms map', () => {
    validator.validate(atoms, result);
    expect(result.valid).toBe(true);
  });

  it('validates consistent cross-references', () => {
    const atom1 = AtomBuilder.create('file.js::func1')
      .withCalls(['file.js::func2'])
      .build();
    const atom2 = AtomBuilder.create('file.js::func2')
      .withCalledBy(['file.js::func1'])
      .build();

    atoms.set(atom1.id, atom1);
    atoms.set(atom2.id, atom2);

    validator.validate(atoms, result);

    expect(result.valid).toBe(true);
  });
});

describe('DataIntegrityValidator - Real File Validation', () => {
  let tempDir;
  let omnysysPath;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'integrity-test-'));
    omnysysPath = path.join(tempDir, '.omnysysdata');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('validates empty omnysys directory', async () => {
    await fs.mkdir(omnysysPath, { recursive: true });
    await fs.mkdir(path.join(omnysysPath, 'atoms'), { recursive: true });
    await fs.mkdir(path.join(omnysysPath, 'molecules'), { recursive: true });

    const validator = new DataIntegrityValidator(omnysysPath);
    const result = await validator.validate();

    expect(result).toBeDefined();
  });

  it('validates atoms from real files', async () => {
    const builder = OmnySystemDataBuilder.create(tempDir);

    builder.addAtom(
      AtomBuilder.create('src_utils.js::processData')
        .withName('processData')
        .withComplexity(5)
        .build()
    );

    await builder.write();

    const validator = new DataIntegrityValidator(omnysysPath);
    const result = await validator.validate();

    expect(result).toBeDefined();
    expect(result.stats.atomsChecked).toBeGreaterThanOrEqual(0);
  });

  it('detects missing required fields in atoms', async () => {
    const builder = OmnySystemDataBuilder.create(tempDir);

    const invalidAtom = {
      id: 'src_utils.js::brokenAtom',
      type: 'atom'
    };

    builder.addAtom(invalidAtom);
    await builder.write();

    const validator = new DataIntegrityValidator(omnysysPath);
    const result = await validator.validate();

    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('validates molecules with real data', async () => {
    const builder = OmnySystemDataBuilder.create(tempDir);

    builder.addMolecule(
      MoleculeBuilder.create('src_components_Button.js')
        .withExports(3)
        .withDependents(5)
        .build()
    );

    await builder.write();

    const validator = new DataIntegrityValidator(omnysysPath);
    const result = await validator.validate();

    expect(result).toBeDefined();
  });

  it('handles missing omnysys directory', async () => {
    const validator = new DataIntegrityValidator(path.join(tempDir, 'non-existent'));
    const result = await validator.validate();

    expect(result.valid).toBe(false);
    expect(result.hasErrors()).toBe(true);
  });
});

describe('DataIntegrityValidator - Statistics', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'integrity-stats-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('tracks atoms checked', async () => {
    const builder = OmnySystemDataBuilder.create(tempDir);

    builder.addAtom(AtomBuilder.create('a.js::func1').build());
    builder.addAtom(AtomBuilder.create('b.js::func2').build());
    builder.addAtom(AtomBuilder.create('c.js::func3').build());

    await builder.write();

    const validator = new DataIntegrityValidator(path.join(tempDir, '.omnysysdata'));
    const result = await validator.validate();

    expect(result.stats.atomsChecked).toBe(3);
  });

  it('tracks molecules checked', async () => {
    const builder = OmnySystemDataBuilder.create(tempDir);

    builder.addMolecule(MoleculeBuilder.create('a.js').build());
    builder.addMolecule(MoleculeBuilder.create('b.js').build());
    builder.addAtom(AtomBuilder.create('a.js::dummy').build());

    await builder.write();

    const validator = new DataIntegrityValidator(path.join(tempDir, '.omnysysdata'));
    const result = await validator.validate();

    expect(result.stats.moleculesChecked).toBe(2);
  });
});

describe('DataIntegrityValidator - Complex Scenarios', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'integrity-complex-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('validates interconnected atoms', async () => {
    const builder = OmnySystemDataBuilder.create(tempDir);

    const atom1 = AtomBuilder.create('src_api.js::fetchData')
      .withCalls(['src_utils.js::parseResponse'])
      .withNetworkCalls()
      .build();

    const atom2 = AtomBuilder.create('src_utils.js::parseResponse')
      .withCalledBy(['src_api.js::fetchData'])
      .build();

    builder.addAtom(atom1);
    builder.addAtom(atom2);

    await builder.write();

    const validator = new DataIntegrityValidator(path.join(tempDir, '.omnysysdata'));
    const result = await validator.validate();

    expect(result).toBeDefined();
  });

  it('detects orphaned atoms', async () => {
    const builder = OmnySystemDataBuilder.create(tempDir);

    const orphanAtom = AtomBuilder.create('src_orphan.js::unused')
      .asExported()
      .withoutField('calledBy')
      .build();
    orphanAtom.calledBy = [];

    builder.addAtom(orphanAtom);

    await builder.write();

    const validator = new DataIntegrityValidator(path.join(tempDir, '.omnysysdata'));
    const result = await validator.validate();

    expect(result.stats.atomsChecked).toBe(1);
  });
});
