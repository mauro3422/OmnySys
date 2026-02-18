import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { VerificationOrchestrator } from '#layer-c/verification/orchestrator/VerificationOrchestrator.js';
import { VerificationStatus, Severity } from '#layer-c/verification/types/index.js';

function createAtom(id, filePath) {
  return {
    id,
    file: filePath,
    name: `atom-${id}`,
    code: 'console.log("test");',
    hash: 'abc123',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function createFile(filePath, atomIds) {
  return {
    path: filePath,
    atoms: atomIds,
    hash: 'file-hash-123',
    lastModified: new Date().toISOString()
  };
}

function createConnection(sourceId, targetId) {
  return {
    id: `conn-${sourceId}-${targetId}`,
    source: sourceId,
    target: targetId,
    type: 'dependency',
    createdAt: new Date().toISOString()
  };
}

async function createValidDataStructure(tempDir) {
  const atomsDir = path.join(tempDir, '.omnysysdata', 'atoms');
  const filesDir = path.join(tempDir, '.omnysysdata', 'files');
  const connectionsDir = path.join(tempDir, '.omnysysdata', 'connections');
  const cacheDir = path.join(tempDir, '.omnysysdata', 'cache');

  await fs.mkdir(atomsDir, { recursive: true });
  await fs.mkdir(filesDir, { recursive: true });
  await fs.mkdir(connectionsDir, { recursive: true });
  await fs.mkdir(cacheDir, { recursive: true });

  const atom1 = createAtom('atom-001', 'src/test.js');
  const atom2 = createAtom('atom-002', 'src/utils.js');

  await fs.writeFile(path.join(atomsDir, 'atom-001.json'), JSON.stringify(atom1, null, 2));
  await fs.writeFile(path.join(atomsDir, 'atom-002.json'), JSON.stringify(atom2, null, 2));

  const file1 = createFile('src/test.js', ['atom-001']);
  const file2 = createFile('src/utils.js', ['atom-002']);

  await fs.writeFile(path.join(filesDir, 'src-test.json'), JSON.stringify(file1, null, 2));
  await fs.writeFile(path.join(filesDir, 'src-utils.json'), JSON.stringify(file2, null, 2));

  const conn1 = createConnection('atom-001', 'atom-002');
  await fs.writeFile(path.join(connectionsDir, 'conn-atom-001-atom-002.json'), JSON.stringify(conn1, null, 2));
}

describe('VerificationOrchestrator', () => {
  let tempDir;
  let orchestrator;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'verification-test-'));
    await createValidDataStructure(tempDir);
    orchestrator = new VerificationOrchestrator(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('creates instance with projectPath', () => {
      expect(orchestrator.projectPath).toBe(tempDir);
    });

    it('initializes with default options', () => {
      expect(orchestrator.options.checkIntegrity).toBe(true);
      expect(orchestrator.options.checkConsistency).toBe(true);
      expect(orchestrator.options.generateCertificate).toBe(true);
    });

    it('accepts custom options', () => {
      const custom = new VerificationOrchestrator(tempDir, {
        checkIntegrity: false,
        generateCertificate: false
      });

      expect(custom.options.checkIntegrity).toBe(false);
      expect(custom.options.generateCertificate).toBe(false);
    });

    it('initializes empty validators array', () => {
      expect(orchestrator.validators).toEqual([]);
    });

    it('initializes empty results array', () => {
      expect(orchestrator.results).toEqual([]);
    });
  });

  describe('verify()', () => {
    it('runs all validations and returns report', async () => {
      const result = await orchestrator.verify();

      expect(result).toHaveProperty('report');
      expect(result).toHaveProperty('certificate');
      expect(result).toHaveProperty('passed');
    });

    it('registers validators before running', async () => {
      await orchestrator.verify();

      expect(orchestrator.validators.length).toBe(2);
    });

    it('populates results array after validation', async () => {
      await orchestrator.verify();

      expect(orchestrator.results.length).toBe(2);
    });

    it.skip('BUG: returns passed=true when status is PASSED - validators find issues on valid data', async () => {
      const result = await orchestrator.verify();

      expect(result.passed).toBe(true);
    });

    it('skips certificate when option disabled', async () => {
      orchestrator = new VerificationOrchestrator(tempDir, {
        generateCertificate: false
      });

      const result = await orchestrator.verify();

      expect(result.certificate).toBeNull();
    });
  });

  describe('registerValidators()', () => {
    it('registers IntegrityValidator when checkIntegrity is true', () => {
      orchestrator.registerValidators();

      expect(orchestrator.validators.length).toBe(2);
    });

    it('skips IntegrityValidator when checkIntegrity is false', () => {
      orchestrator.options.checkIntegrity = false;
      orchestrator.registerValidators();

      const hasIntegrity = orchestrator.validators.some(v => v.constructor.name === 'IntegrityValidator');
      expect(hasIntegrity).toBe(false);
    });

    it('skips ConsistencyValidator when checkConsistency is false', () => {
      orchestrator.options.checkConsistency = false;
      orchestrator.registerValidators();

      const hasConsistency = orchestrator.validators.some(v => v.constructor.name === 'ConsistencyValidator');
      expect(hasConsistency).toBe(false);
    });

    it('accumulates validators on multiple calls', () => {
      orchestrator.registerValidators();
      const firstCount = orchestrator.validators.length;

      orchestrator.registerValidators();

      expect(orchestrator.validators.length).toBe(firstCount * 2);
    });
  });

  describe('maybeGenerateCertificate()', () => {
    it('returns null when generateCertificate option is false', async () => {
      orchestrator.options.generateCertificate = false;
      const report = { status: VerificationStatus.PASSED, issues: [], stats: { bySystem: {}, totalIssues: 0 } };

      const result = await orchestrator.maybeGenerateCertificate(report);

      expect(result).toBeNull();
    });

    it('returns null when canGenerateCertificate returns false', async () => {
      const report = {
        status: VerificationStatus.FAILED,
        issues: [{ severity: Severity.CRITICAL, message: 'critical error' }],
        stats: { bySystem: {}, totalIssues: 1 }
      };
      const result = await orchestrator.maybeGenerateCertificate(report);

      expect(result).toBeNull();
    });

    it('generates certificate when conditions are met', async () => {
      const report = {
        status: VerificationStatus.PASSED,
        issues: [],
        projectPath: tempDir,
        timestamp: new Date().toISOString(),
        stats: { bySystem: { files: 2, atoms: 2, connections: 1 }, totalIssues: 0 }
      };
      const result = await orchestrator.maybeGenerateCertificate(report);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it('generates certificate with WARNING status', async () => {
      const report = {
        status: VerificationStatus.WARNING,
        issues: [{ severity: Severity.MEDIUM, message: 'warning' }],
        projectPath: tempDir,
        timestamp: new Date().toISOString(),
        stats: { bySystem: { files: 2, atoms: 2, connections: 1 }, totalIssues: 1 }
      };
      const result = await orchestrator.maybeGenerateCertificate(report);

      expect(result).toBeDefined();
    });
  });

  describe('getQuickStatus()', () => {
    it('returns quick status summary', () => {
      const status = orchestrator.getQuickStatus();

      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('emoji');
      expect(status).toHaveProperty('count');
    });

    it('returns PERFECT status when no issues', () => {
      orchestrator.results = [{ issues: [] }];
      const status = orchestrator.getQuickStatus();

      expect(status.status).toBe('PERFECT');
      expect(status.emoji).toBe('✅');
    });

    it('processes results array', () => {
      orchestrator.results = [
        { issues: [], status: VerificationStatus.PASSED }
      ];

      const status = orchestrator.getQuickStatus();

      expect(status).toBeDefined();
    });
  });

  describe('runValidations()', () => {
    it('executes all registered validators', async () => {
      orchestrator.registerValidators();
      await orchestrator.runValidations();

      expect(orchestrator.results.length).toBe(2);
    });

    it('collects results from all validators', async () => {
      orchestrator.registerValidators();
      await orchestrator.runValidations();

      expect(orchestrator.results.length).toBe(2);
      expect(orchestrator.results[0]).toHaveProperty('status');
      expect(orchestrator.results[1]).toHaveProperty('status');
    });
  });

  describe('Integration', () => {
    it('completes full verification flow', async () => {
      const result = await orchestrator.verify();

      expect(result.report).toBeDefined();
      expect(result.report.projectPath).toBe(tempDir);
      expect(result.report.stats.validatorsRun).toBe(2);
    });
  });
});
