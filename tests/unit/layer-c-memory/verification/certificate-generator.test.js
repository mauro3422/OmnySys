import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  generateCertificate,
  generateCertificateId,
  calculateValidity,
  calculateHash,
  isCertificateValid,
  canGenerateCertificate
} from '#layer-c/verification/orchestrator/certificates/certificate-generator.js';
import { VerificationStatus, Severity } from '#layer-c/verification/types/index.js';

function createReport(overrides = {}) {
  return {
    projectPath: '/test/project',
    timestamp: new Date().toISOString(),
    status: VerificationStatus.PASSED,
    issues: [],
    stats: {
      totalIssues: 0,
      bySystem: { files: 10, atoms: 5, connections: 3 },
      bySeverity: {},
      validatorsRun: 2
    },
    ...overrides
  };
}

describe('Certificate Generator', () => {
  let tempDir;
  const projectPath = '/test/project';

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cert-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('generateCertificate()', () => {
    it('creates valid certificate', async () => {
      const report = createReport();

      const certificate = await generateCertificate(report, projectPath);

      expect(certificate).toBeDefined();
      expect(certificate.id).toBeDefined();
      expect(certificate.projectPath).toBe(projectPath);
    });

    it('includes issuedAt timestamp', async () => {
      const report = createReport();

      const certificate = await generateCertificate(report, projectPath);

      expect(certificate.issuedAt).toBeDefined();
      expect(new Date(certificate.issuedAt)).toBeInstanceOf(Date);
    });

    it('includes validUntil timestamp', async () => {
      const report = createReport();

      const certificate = await generateCertificate(report, projectPath);

      expect(certificate.validUntil).toBeDefined();
      expect(new Date(certificate.validUntil)).toBeInstanceOf(Date);
    });

    it('sets certificate version', async () => {
      const report = createReport();

      const certificate = await generateCertificate(report, projectPath);

      expect(certificate.version).toBe('1.0.0');
    });

    it('includes report status', async () => {
      const report = createReport();

      const certificate = await generateCertificate(report, projectPath);

      expect(certificate.status).toBe(VerificationStatus.PASSED);
    });

    it('includes metrics from report', async () => {
      const report = createReport({
        stats: {
          totalIssues: 0,
          bySystem: { files: 10, atoms: 5, connections: 3 },
          bySeverity: {},
          validatorsRun: 2
        }
      });

      const certificate = await generateCertificate(report, projectPath);

      expect(certificate.metrics.totalFiles).toBe(10);
      expect(certificate.metrics.totalAtoms).toBe(5);
      expect(certificate.metrics.totalConnections).toBe(3);
    });

    it('includes hash', async () => {
      const report = createReport();

      const certificate = await generateCertificate(report, projectPath);

      expect(certificate.hash).toBeDefined();
      expect(typeof certificate.hash).toBe('string');
    });

    it('includes validator signatures', async () => {
      const report = createReport();

      const certificate = await generateCertificate(report, projectPath);

      expect(Array.isArray(certificate.signatures)).toBe(true);
      expect(certificate.signatures).toContain('integrity-validator');
      expect(certificate.signatures).toContain('consistency-validator');
    });

    it('includes issues found count', async () => {
      const report = createReport({
        stats: {
          totalIssues: 1,
          bySystem: { files: 10, atoms: 5, connections: 3 },
          bySeverity: { medium: 1 },
          validatorsRun: 2
        }
      });

      const certificate = await generateCertificate(report, projectPath);

      expect(certificate.metrics.issuesFound).toBe(1);
    });
  });

  describe('generateCertificateId()', () => {
    it('generates unique ID', () => {
      const report = { timestamp: Date.now() };

      const id1 = generateCertificateId(report, '/path1');
      const id2 = generateCertificateId(report, '/path2');

      expect(id1).not.toBe(id2);
    });

    it('starts with cert- prefix', () => {
      const report = { timestamp: Date.now() };

      const id = generateCertificateId(report, projectPath);

      expect(id.startsWith('cert-')).toBe(true);
    });

    it('includes timestamp', () => {
      const report = { timestamp: Date.now() };

      const id = generateCertificateId(report, projectPath);

      expect(id).toMatch(/cert-\d+-/);
    });
  });

  describe('calculateValidity()', () => {
    it('returns date 7 days in the future', () => {
      const validUntil = calculateValidity();
      const now = new Date();
      const expected = new Date(now);
      expected.setDate(expected.getDate() + 7);

      const diff = new Date(validUntil) - expected;
      expect(Math.abs(diff)).toBeLessThan(1000);
    });

    it('returns ISO string format', () => {
      const validUntil = calculateValidity();

      expect(typeof validUntil).toBe('string');
      expect(validUntil).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('calculateHash()', () => {
    it('returns SHA256 hash', () => {
      const report = {
        projectPath: '/test',
        timestamp: '2024-01-01T00:00:00.000Z',
        status: 'passed',
        stats: { totalIssues: 0 }
      };

      const hash = calculateHash(report);

      expect(hash).toBeDefined();
      expect(hash.length).toBe(64);
    });

    it('produces different hashes for different reports', () => {
      const report1 = {
        projectPath: '/test1',
        timestamp: '2024-01-01T00:00:00.000Z',
        status: 'passed',
        stats: { totalIssues: 0 }
      };
      const report2 = {
        projectPath: '/test2',
        timestamp: '2024-01-01T00:00:00.000Z',
        status: 'passed',
        stats: { totalIssues: 0 }
      };

      const hash1 = calculateHash(report1);
      const hash2 = calculateHash(report2);

      expect(hash1).not.toBe(hash2);
    });

    it('produces same hash for same report', () => {
      const report = {
        projectPath: '/test',
        timestamp: '2024-01-01T00:00:00.000Z',
        status: 'passed',
        stats: { totalIssues: 0 }
      };

      const hash1 = calculateHash(report);
      const hash2 = calculateHash(report);

      expect(hash1).toBe(hash2);
    });
  });

  describe('isCertificateValid()', () => {
    it('returns true for valid certificate', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const certificate = {
        validUntil: futureDate.toISOString()
      };

      expect(isCertificateValid(certificate)).toBe(true);
    });

    it('returns false for expired certificate', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const certificate = {
        validUntil: pastDate.toISOString()
      };

      expect(isCertificateValid(certificate)).toBe(false);
    });

    it('returns false for null certificate', () => {
      expect(isCertificateValid(null)).toBe(false);
    });

    it('returns false for undefined certificate', () => {
      expect(isCertificateValid(undefined)).toBe(false);
    });

    it('returns false for certificate without validUntil', () => {
      expect(isCertificateValid({})).toBe(false);
    });

    it('returns false for certificate with invalid validUntil', () => {
      expect(isCertificateValid({ validUntil: 'invalid' })).toBe(false);
    });
  });

  describe('canGenerateCertificate()', () => {
    it('returns true for passed status', () => {
      const report = {
        status: VerificationStatus.PASSED,
        issues: []
      };

      expect(canGenerateCertificate(report)).toBe(true);
    });

    it('returns true for warning status without critical issues', () => {
      const report = {
        status: VerificationStatus.WARNING,
        issues: [
          { severity: Severity.MEDIUM, message: 'warning issue' }
        ]
      };

      expect(canGenerateCertificate(report)).toBe(true);
    });

    it('returns false for warning status with critical issues', () => {
      const report = {
        status: VerificationStatus.WARNING,
        issues: [
          { severity: Severity.CRITICAL, message: 'critical issue' }
        ]
      };

      expect(canGenerateCertificate(report)).toBe(false);
    });

    it('returns false for failed status', () => {
      const report = {
        status: VerificationStatus.FAILED,
        issues: []
      };

      expect(canGenerateCertificate(report)).toBe(false);
    });

    it('returns true when status is passed even with critical issues', () => {
      const report = {
        status: VerificationStatus.PASSED,
        issues: [
          { severity: Severity.CRITICAL, message: 'critical' }
        ]
      };

      expect(canGenerateCertificate(report)).toBe(true);
    });

    it('handles empty issues array', () => {
      const report = {
        status: VerificationStatus.PASSED,
        issues: []
      };

      expect(canGenerateCertificate(report)).toBe(true);
    });
  });

  describe('Certificate Expiry Handling', () => {
    it('certificate valid until 7 days from issue', async () => {
      const report = createReport();

      const certificate = await generateCertificate(report, projectPath);

      const issuedAt = new Date(certificate.issuedAt);
      const validUntil = new Date(certificate.validUntil);
      const diffDays = (validUntil - issuedAt) / (1000 * 60 * 60 * 24);

      expect(diffDays).toBeCloseTo(7, 0);
    });

    it('isCertificateValid checks expiry correctly', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const expiredCert = {
        validUntil: pastDate.toISOString()
      };

      expect(isCertificateValid(expiredCert)).toBe(false);
    });

    it('certificate with future expiry is valid', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const validCert = {
        validUntil: futureDate.toISOString()
      };

      expect(isCertificateValid(validCert)).toBe(true);
    });
  });

  describe('Integration', () => {
    it('generates complete certificate from report', async () => {
      const report = createReport({
        projectPath: projectPath,
        stats: {
          totalIssues: 0,
          bySystem: { files: 100, atoms: 50, connections: 25 },
          bySeverity: {},
          validatorsRun: 2
        }
      });

      const certificate = await generateCertificate(report, projectPath);

      expect(certificate.id).toBeDefined();
      expect(certificate.projectPath).toBe(projectPath);
      expect(certificate.status).toBe(VerificationStatus.PASSED);
      expect(certificate.metrics.totalFiles).toBe(100);
      expect(certificate.metrics.totalAtoms).toBe(50);
      expect(certificate.metrics.totalConnections).toBe(25);
      expect(certificate.hash).toBeDefined();
      expect(certificate.signatures).toHaveLength(2);
    });
  });
});
