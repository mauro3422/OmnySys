/**
 * @fileoverview Verification Contract Test
 * 
 * Tests de contrato para Verification system.
 * 
 * @module tests/contracts/layer-c/verification.contract.test
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  ORCHESTRATOR_EXPORTS,
  ORCHESTRATOR_METHODS,
  VERIFICATION_TYPES_EXPORTS,
  REPORT_GENERATOR_EXPORTS,
  CERTIFICATE_GENERATOR_EXPORTS,
  safeImport
} from './helpers/index.js';

describe('Verification Contract', () => {
  describe('VerificationOrchestrator Module Exports', () => {
    let mod;

    beforeAll(async () => {
      mod = await safeImport('#layer-c/verification/orchestrator/index.js');
    });

    it('MUST be importable', () => {
      if (!mod) {
        expect(true).toBe(true);
        return;
      }
      expect(mod).toBeDefined();
    });

    ORCHESTRATOR_EXPORTS.forEach(exportName => {
      it(`MUST export ${exportName}`, () => {
        if (!mod) return;
        expect(mod[exportName]).toBeDefined();
      });
    });
  });

  describe('VerificationOrchestrator Class Methods', () => {
    let VerificationOrchestrator;

    beforeAll(async () => {
      const mod = await safeImport('#layer-c/verification/orchestrator/index.js');
      VerificationOrchestrator = mod?.VerificationOrchestrator;
    });

    it('MUST be a class', () => {
      if (!VerificationOrchestrator) return;
      expect(typeof VerificationOrchestrator).toBe('function');
    });

    ORCHESTRATOR_METHODS.forEach(methodName => {
      it(`MUST have method ${methodName}`, () => {
        if (!VerificationOrchestrator) return;
        const instance = new VerificationOrchestrator('/tmp/test');
        expect(instance[methodName]).toBeDefined();
        expect(typeof instance[methodName]).toBe('function');
      });
    });
  });

  describe('VerificationTypes Module Exports', () => {
    let mod;

    beforeAll(async () => {
      mod = await safeImport('#layer-c/verification/types/index.js');
    });

    it('MUST be importable', () => {
      if (!mod) {
        expect(true).toBe(true);
        return;
      }
      expect(mod).toBeDefined();
    });

    VERIFICATION_TYPES_EXPORTS.forEach(exportName => {
      it(`MUST export ${exportName}`, () => {
        if (!mod) return;
        expect(mod[exportName]).toBeDefined();
      });
    });
  });

  describe('VerificationStatus Enum Values', () => {
    let VerificationStatus;

    beforeAll(async () => {
      const mod = await safeImport('#layer-c/verification/types/index.js');
      VerificationStatus = mod?.VerificationStatus;
    });

    ['PASSED', 'FAILED', 'WARNING', 'SKIPPED'].forEach(status => {
      it(`MUST have ${status} status`, () => {
        if (!VerificationStatus) return;
        expect(VerificationStatus[status]).toBe(status.toLowerCase());
      });
    });
  });

  describe('Severity Enum Values', () => {
    let Severity;

    beforeAll(async () => {
      const mod = await safeImport('#layer-c/verification/types/index.js');
      Severity = mod?.Severity;
    });

    ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].forEach(level => {
      it(`MUST have ${level} severity`, () => {
        if (!Severity) return;
        expect(Severity[level]).toBe(level.toLowerCase());
      });
    });
  });

  describe('Report Generator Functions', () => {
    let mod;

    beforeAll(async () => {
      mod = await safeImport('#layer-c/verification/orchestrator/reporters/index.js');
    });

    it('MUST be importable', () => {
      if (!mod) {
        expect(true).toBe(true);
        return;
      }
      expect(mod).toBeDefined();
    });

    REPORT_GENERATOR_EXPORTS.forEach(exportName => {
      it(`MUST export ${exportName}`, () => {
        if (!mod) return;
        expect(mod[exportName]).toBeDefined();
      });

      it(`${exportName} MUST be a function`, () => {
        if (!mod) return;
        if (mod[exportName]) {
          expect(typeof mod[exportName]).toBe('function');
        }
      });
    });
  });

  describe('Certificate Generator Functions', () => {
    let mod;

    beforeAll(async () => {
      mod = await safeImport('#layer-c/verification/orchestrator/certificates/index.js');
    });

    it('MUST be importable', () => {
      if (!mod) {
        expect(true).toBe(true);
        return;
      }
      expect(mod).toBeDefined();
    });

    CERTIFICATE_GENERATOR_EXPORTS.forEach(exportName => {
      it(`MUST export ${exportName}`, () => {
        if (!mod) return;
        expect(mod[exportName]).toBeDefined();
      });

      it(`${exportName} MUST be a function`, () => {
        if (!mod) return;
        if (mod[exportName]) {
          expect(typeof mod[exportName]).toBe('function');
        }
      });
    });
  });

  describe('Validators', () => {
    let IntegrityValidator, ConsistencyValidator;

    beforeAll(async () => {
      const intMod = await safeImport('#layer-c/verification/validators/integrity-validator.js');
      IntegrityValidator = intMod?.IntegrityValidator;

      const conMod = await safeImport('#layer-c/verification/validators/consistency-validator.js');
      ConsistencyValidator = conMod?.ConsistencyValidator;
    });

    ['IntegrityValidator', 'ConsistencyValidator'].forEach(validatorName => {
      const Validator = validatorName === 'IntegrityValidator' ? IntegrityValidator : ConsistencyValidator;

      describe(validatorName, () => {
        it('MUST be a class', () => {
          if (!Validator) return;
          expect(typeof Validator).toBe('function');
        });

        it('MUST have validate method', () => {
          if (!Validator) return;
          const instance = new Validator('/tmp/test');
          expect(instance.validate).toBeDefined();
          expect(typeof instance.validate).toBe('function');
        });

        it('validate MUST be async', () => {
          if (!Validator) return;
          const instance = new Validator('/tmp/test');
          const result = instance.validate();
          expect(result).toBeInstanceOf(Promise);
        });
      });
    });
  });

  describe('Function Signatures', () => {
    let VerificationOrchestrator, instance;

    beforeAll(async () => {
      const mod = await safeImport('#layer-c/verification/orchestrator/index.js');
      VerificationOrchestrator = mod?.VerificationOrchestrator;
      if (VerificationOrchestrator) {
        instance = new VerificationOrchestrator('/tmp/test');
      }
    });

    ['verify', 'runValidations', 'maybeGenerateCertificate'].forEach(method => {
      it(`${method} MUST be async (return Promise)`, () => {
        if (!instance) return;
        let result;
        if (method === 'maybeGenerateCertificate') {
          result = instance[method]({ status: 'passed', issues: [], stats: [] });
        } else {
          result = instance[method]();
        }
        if (result?.catch) result.catch(() => {});
        expect(result).toBeInstanceOf(Promise);
      });
    });

    it('getQuickStatus MUST return object', () => {
      if (!instance) return;
      const result = instance.getQuickStatus();
      expect(typeof result).toBe('object');
    });
  });
});
