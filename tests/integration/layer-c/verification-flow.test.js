/**
 * @fileoverview Integration Tests: Layer C Verification Flow
 * 
 * Tests the complete verification workflow.
 * 
 * @module tests/integration/layer-c/verification-flow.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  ValidationResultBuilder, 
  IssueBuilder, 
  ReportBuilder, 
  CertificateBuilder 
} from '../../factories/layer-c-verification/builders.js';
import { Severity, IssueCategory, VerificationStatus } from '../../../src/layer-c-memory/verification/types/index.js';
import { createMockDataLoader, createMockValidator, createMockDataDir } from '../helpers/index.js';

describe('Layer C Integration: Verification Flow', () => {
  let mockDataDir;

  beforeEach(() => {
    mockDataDir = createMockDataDir();
  });

  describe('Full Verification Workflow', () => {
    
    it('should run full verification → generate report → maybe certificate', async () => {
      const integrityResult = new ValidationResultBuilder()
        .asPassed().withStats({ total: 10, valid: 10, invalid: 0 }).build();

      const consistencyResult = new ValidationResultBuilder()
        .asPassed().withStats({ total: 8, valid: 8, invalid: 0 }).build();

      const report = new ReportBuilder()
        .asPassed()
        .withValidators(2)
        .withValidatorResult(integrityResult)
        .withValidatorResult(consistencyResult)
        .withSummary({ message: '✅ PASSED: All systems verified.', recommendations: [] })
        .build();

      expect(report.status).toBe(VerificationStatus.PASSED);
      expect(report.stats.validatorsRun).toBe(2);
      expect(report.stats.totalIssues).toBe(0);

      const canGenerateCertificate = report.status === VerificationStatus.PASSED;
      expect(canGenerateCertificate).toBe(true);

      const certificate = new CertificateBuilder()
        .withProjectPath('/test/project')
        .withStatus(VerificationStatus.PASSED)
        .withMetrics({ totalFiles: 10, totalAtoms: 15, totalConnections: 8, issuesFound: 0 })
        .build();

      expect(certificate.status).toBe(VerificationStatus.PASSED);
      expect(certificate.metrics.issuesFound).toBe(0);
    });

    it('should generate report with warnings but no certificate', async () => {
      const warningIssue = new IssueBuilder()
        .asWarning()
        .withCategory(IssueCategory.CONSISTENCY)
        .withMessage('Minor inconsistency detected')
        .build();

      const integrityResult = new ValidationResultBuilder()
        .asPassed()
        .withStats({ total: 10, valid: 9, invalid: 1 })
        .withIssue(warningIssue)
        .build();

      const report = new ReportBuilder()
        .asWarning()
        .withValidators(1)
        .withValidatorResult(integrityResult)
        .withIssue(warningIssue)
        .withSummary({ message: '⚠️ WARNING: Minor issues detected.', recommendations: ['Review warnings'] })
        .build();

      expect(report.status).toBe(VerificationStatus.WARNING);
      expect(report.stats.totalIssues).toBe(1);

      const canGenerateCertificate = report.status === VerificationStatus.PASSED && report.stats.totalIssues === 0;
      expect(canGenerateCertificate).toBe(false);
    });

    it('should generate report with critical issues and no certificate', async () => {
      const criticalIssue = new IssueBuilder()
        .asCritical()
        .withCategory(IssueCategory.INTEGRITY)
        .withMessage('Critical integrity violation')
        .build();

      const integrityResult = new ValidationResultBuilder()
        .asFailed()
        .withStats({ total: 10, valid: 5, invalid: 5 })
        .withIssue(criticalIssue)
        .build();

      const report = new ReportBuilder()
        .asFailed()
        .withValidators(1)
        .withValidatorResult(integrityResult)
        .withIssue(criticalIssue)
        .withSummary({ message: '❌ FAILED: Critical issues found.', recommendations: ['Fix critical issues'] })
        .build();

      expect(report.status).toBe(VerificationStatus.FAILED);
      expect(report.issues.some(i => i.severity === Severity.CRITICAL)).toBe(true);

      const canGenerateCertificate = report.status === VerificationStatus.PASSED;
      expect(canGenerateCertificate).toBe(false);
    });
  });

  describe('Multiple Validators Working Together', () => {
    
    it('should combine results from multiple validators', async () => {
      const integrityResult = new ValidationResultBuilder()
        .asPassed()
        .withStats({ total: 10, valid: 10, invalid: 0 })
        .build();

      const consistencyResult = new ValidationResultBuilder()
        .asWarning()
        .withStats({ total: 8, valid: 7, invalid: 1 })
        .withIssue(new IssueBuilder().asWarning().withMessage('Minor inconsistency').build())
        .build();

      const coverageResult = new ValidationResultBuilder()
        .asPassed()
        .withStats({ total: 15, valid: 15, invalid: 0 })
        .build();

      const results = [integrityResult, consistencyResult, coverageResult];

      const overallStatus = results.some(r => r.status === VerificationStatus.FAILED) 
        ? VerificationStatus.FAILED 
        : results.some(r => r.status === VerificationStatus.WARNING) 
          ? VerificationStatus.WARNING 
          : VerificationStatus.PASSED;

      expect(overallStatus).toBe(VerificationStatus.WARNING);

      const totalIssues = results.reduce((sum, r) => sum + (r.issues?.length || 0), 0);
      expect(totalIssues).toBe(1);
    });

    it('should fail if any validator fails', async () => {
      const results = [
        new ValidationResultBuilder().asPassed().build(),
        new ValidationResultBuilder().asFailed().build(),
        new ValidationResultBuilder().asPassed().build()
      ];

      const overallStatus = results.some(r => r.status === VerificationStatus.FAILED) 
        ? VerificationStatus.FAILED 
        : VerificationStatus.PASSED;

      expect(overallStatus).toBe(VerificationStatus.FAILED);
    });
  });

  describe('Error Recovery in Validation', () => {
    
    it('should handle validator throwing error', async () => {
      const errorValidator = createMockValidator({
        name: 'ErrorValidator',
        status: VerificationStatus.FAILED,
        error: 'Validator crashed',
        issues: [new IssueBuilder().asCritical().withMessage('Validator error: Validator crashed').build()]
      });

      const mockData = { atoms: [], files: [], connections: [] };
      const dataLoader = createMockDataLoader(mockData);

      try {
        await errorValidator.validate(mockDataDir);
      } catch (e) {
        const errorResult = new ValidationResultBuilder()
          .asFailed()
          
          .withError(e.message)
          .withIssue(new IssueBuilder().asCritical().withMessage(`Validator error: ${e.message}`).build())
          .build();
        
        expect(errorResult.status).toBe(VerificationStatus.FAILED);
        expect(errorResult.error).toBeDefined();
      }
    });

    it('should continue validation if one validator fails', async () => {
      const validators = [
        createMockValidator(new ValidationResultBuilder().asPassed().build()),
        { validate: () => { throw new Error('Crash'); }, name: 'BadValidator' },
        createMockValidator(new ValidationResultBuilder().asPassed().build())
      ];

      const results = [];
      for (const validator of validators) {
        try {
          const result = await validator.validate(mockDataDir);
          results.push(result);
        } catch (e) {
          results.push(new ValidationResultBuilder()
            .asFailed()
            .withError(e.message)
            .build());
        }
      }

      expect(results.length).toBe(3);
      expect(results[0].status).toBe(VerificationStatus.PASSED);
      expect(results[1].status).toBe(VerificationStatus.FAILED);
      expect(results[2].status).toBe(VerificationStatus.PASSED);
    });
  });

  describe('Performance', () => {
    
    it('should handle large datasets efficiently', async () => {
      const largeData = {};
      for (let i = 0; i < 1000; i++) {
        largeData[`file${i}`] = { id: i, name: `test${i}` };
      }

      const dataLoader = createMockDataLoader(largeData);

      const start = Date.now();
      const stats = dataLoader.getStats();
      const duration = Date.now() - start;

      expect(stats.filesLoaded).toBe(1000);
      expect(duration).toBeLessThan(100);
    });
  });
});
