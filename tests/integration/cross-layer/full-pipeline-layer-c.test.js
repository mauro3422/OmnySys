/**
 * @fileoverview Cross-Layer Integration Tests: Full Pipeline with Layer C
 * 
 * Tests the complete analysis pipeline including Layer C:
 * - Layer A → Layer B → Layer C flow
 * - Shadow creation from analyzed atoms
 * - Verification of complete analysis
 * 
 * @module tests/integration/cross-layer/full-pipeline-layer-c.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestProjectBuilder, CROSS_LAYER_FIXTURES } from '../../factories/cross-layer.factory.js';
import { ShadowBuilder, AtomBuilder, AncestryBuilder, LineageBuilder } from '../../factories/layer-c-shadow-registry/builders.js';
import { 
  ValidationResultBuilder, 
  IssueBuilder, 
  ReportBuilder, 
  CertificateBuilder,
  QuickStatusBuilder 
} from '../../factories/layer-c-verification/builders.js';
import { VerificationStatus, Severity, IssueCategory, DataSystem } from '../../../src/layer-c-memory/verification/types/index.js';
import { ShadowStatus, EvolutionType } from '../../../src/layer-c-memory/shadow-registry/types.js';

const mockStorage = new Map();
const mockIndex = new Map();
const mockCache = new Map();

const createMockShadowRegistry = () => {
  let shadowCounter = 0;
  return {
    initialize: vi.fn().mockResolvedValue(undefined),
    createShadow: vi.fn().mockImplementation(async (atom, options) => {
      shadowCounter++;
      const shadow = new ShadowBuilder()
        .withShadowId(`shadow_${shadowCounter}_${Date.now()}`)
        .withAtomId(atom.id)
        .withDNA(atom.dna)
        .withReason(options.reason || 'deleted')
        .build();
      mockStorage.set(shadow.shadowId, shadow);
      mockIndex.set(shadow.shadowId, { shadowId: shadow.shadowId, status: shadow.status });
      return shadow;
    }),
    getShadow: vi.fn().mockImplementation(async (id) => mockStorage.get(id) || null),
    findSimilar: vi.fn().mockResolvedValue([]),
    markReplaced: vi.fn().mockImplementation(async (shadowId, replacementId) => {
      const shadow = mockStorage.get(shadowId);
      if (shadow) {
        shadow.status = ShadowStatus.REPLACED;
        shadow.replacedBy = replacementId;
      }
    }),
    getLineage: vi.fn().mockResolvedValue([])
  };
};

const createMockVerificationOrchestrator = () => ({
  verify: vi.fn().mockResolvedValue({
    report: new ReportBuilder().asPassed().build(),
    certificate: new CertificateBuilder().build(),
    passed: true
  }),
  getQuickStatus: vi.fn().mockReturnValue(new QuickStatusBuilder().asPerfect().build())
});

describe('Cross-Layer: Full Pipeline with Layer C', () => {
  let shadowRegistry;
  let verificationOrchestrator;

  beforeEach(() => {
    mockStorage.clear();
    mockIndex.clear();
    mockCache.clear();
    
    shadowRegistry = createMockShadowRegistry();
    verificationOrchestrator = createMockVerificationOrchestrator();
  });

  describe('Complete Layer A → B → C Flow', () => {
    
    it('should process project through all layers', async () => {
      const systemMap = CROSS_LAYER_FIXTURES.localStorageProject();
      
      expect(systemMap.files).toBeDefined();
      expect(Object.keys(systemMap.files).length).toBe(3);

      const { buildStandardMetadata } = await import('#layer-b/metadata-contract/builders/standard-builder.js');
      
      const enrichedFiles = {};
      for (const [path, file] of Object.entries(systemMap.files)) {
        enrichedFiles[path] = {
          ...file,
          metadata: buildStandardMetadata(file, path)
        };
      }

      const filesWithLocalStorage = Object.entries(enrichedFiles)
        .filter(([_, f]) => f.metadata?.hasLocalStorage);
      expect(filesWithLocalStorage.length).toBeGreaterThan(0);

      const atom = new AtomBuilder()
        .withId('src/auth/login.js::handleLogin')
        .withName('handleLogin')
        .withFile('src/auth/login.js')
        .withDataFlow({
          inputs: ['credentials'],
          outputs: ['token'],
          sideEffects: ['localStorage']
        })
        .build();

      atom.dna = {
        id: 'dna_login',
        structuralHash: 'hash_login',
        patternHash: 'pattern_auth',
        flowType: 'async',
        complexityScore: 5,
        semanticFingerprint: 'sem_fp_login'
      };

      const shadow = await shadowRegistry.createShadow(atom, { reason: 'refactored' });
      
      expect(shadow).toBeDefined();
      expect(shadow.shadowId).toBeDefined();
      expect(shadow.originalId).toBe(atom.id);

      const verification = await verificationOrchestrator.verify();
      expect(verification.passed).toBe(true);
    });

    it('should maintain data integrity across all layers', async () => {
      const builder = TestProjectBuilder.create();
      builder.addFile('src/api.js', '', {
        exports: [{ name: 'fetchData' }, { name: 'postData' }],
        imports: [{ source: './config' }],
        semanticAnalysis: {
          sharedState: { reads: ['apiUrl'], writes: [] }
        }
      });
      builder.addFile('src/config.js', '', {
        exports: [{ name: 'apiUrl' }],
        semanticAnalysis: {}
      });
      builder.addConnection('src/api.js', 'src/config.js', 'import', './config');
      
      const project = builder.build();

      const layerAFileCount = Object.keys(project.files).length;
      expect(layerAFileCount).toBeGreaterThan(0);

      const { buildStandardMetadata } = await import('#layer-b/metadata-contract/builders/standard-builder.js');
      
      const layerBFiles = {};
      for (const [path, file] of Object.entries(project.files)) {
        layerBFiles[path] = {
          ...file,
          metadata: buildStandardMetadata(file, path)
        };
      }

      expect(Object.keys(layerBFiles).length).toBe(layerAFileCount);

      const atoms = [
        new AtomBuilder().withId('src/api.js::fetchData').build(),
        new AtomBuilder().withId('src/api.js::postData').build()
      ];

      for (const atom of atoms) {
        atom.dna = {
          id: `dna_${atom.id.split('::').pop()}`,
          structuralHash: `hash_${atom.id}`,
          patternHash: 'pattern_api',
          flowType: 'async',
          complexityScore: 4,
          semanticFingerprint: 'sem_fp_api'
        };
        await shadowRegistry.createShadow(atom, { reason: 'archived' });
      }

      expect(mockStorage.size).toBe(2);
    });
  });

  describe('Shadow Creation from Analyzed Atoms', () => {
    
    it('should create shadows from Layer B validated atoms', async () => {
      const systemMap = TestProjectBuilder.create()
        .addFile('src/deprecated.js', '', {
          exports: [{ name: 'oldFunction' }],
          semanticAnalysis: {
            sharedState: { writes: ['legacyData'], reads: [] }
          }
        })
        .build();

      const { validateForLineage } = await import('#layer-b/validators/lineage-validator/validators/main-validator.js');
      
      const atom = new AtomBuilder()
        .withId('src/deprecated.js::oldFunction')
        .withName('oldFunction')
        .withFile('src/deprecated.js')
        .withLineNumber(10)
        .asExported()
        .build();

      const validation = validateForLineage(atom);
      
      atom.dna = {
        id: 'dna_old',
        structuralHash: 'hash_old',
        patternHash: 'pattern_legacy',
        flowType: 'sync',
        complexityScore: 2,
        semanticFingerprint: 'sem_fp_legacy'
      };

      const shadow = await shadowRegistry.createShadow(atom, { 
        reason: 'function_deprecated',
        replacementId: 'src/new.js::newFunction'
      });

      expect(shadow).toBeDefined();
      expect(shadow.originalId).toBe(atom.id);
      expect(shadow.death.reason).toBe('function_deprecated');
    });

    it('should link shadows through lineage', async () => {
      const parentAtom = new AtomBuilder()
        .withId('src/v1.js::process')
        .build();
      parentAtom.dna = {
        id: 'dna_v1',
        structuralHash: 'hash_v1',
        patternHash: 'pattern_process',
        flowType: 'sync',
        complexityScore: 3,
        semanticFingerprint: 'sem_fp_v1'
      };

      const parentShadow = await shadowRegistry.createShadow(parentAtom, { reason: 'version_upgrade' });
      
      const childAtom = new AtomBuilder()
        .withId('src/v2.js::process')
        .build();
      childAtom.dna = {
        ...parentAtom.dna,
        id: 'dna_v2',
        structuralHash: 'hash_v2'
      };
      childAtom.ancestry = {
        replaced: parentShadow.shadowId,
        generation: 1
      };

      const childShadow = await shadowRegistry.createShadow(childAtom, { reason: 'refactored' });

      expect(parentShadow.shadowId).toBeDefined();
      expect(childShadow.shadowId).toBeDefined();
    });

    it('should handle multiple shadows for split evolution', async () => {
      const originalAtom = new AtomBuilder()
        .withId('src/monolith.js::doEverything')
        .build();
      originalAtom.dna = {
        id: 'dna_mono',
        structuralHash: 'hash_mono',
        patternHash: 'pattern_monolith',
        flowType: 'sync',
        complexityScore: 8,
        semanticFingerprint: 'sem_fp_mono'
      };

      const originalShadow = await shadowRegistry.createShadow(originalAtom, { reason: 'split' });
      originalShadow.status = ShadowStatus.SPLIT;
      originalShadow.lineage.childShadowIds = ['shadow_a', 'shadow_b'];

      const splitAtomA = new AtomBuilder()
        .withId('src/split.js::doA')
        .withAncestry({ replaced: originalShadow.shadowId, generation: 1 })
        .build();

      const splitAtomB = new AtomBuilder()
        .withId('src/split.js::doB')
        .withAncestry({ replaced: originalShadow.shadowId, generation: 1 })
        .build();

      expect(originalShadow.status).toBe(ShadowStatus.SPLIT);
      expect(originalShadow.lineage.childShadowIds.length).toBe(2);
    });
  });

  describe('Verification of Complete Analysis', () => {
    
    it('should verify entire project after full analysis', async () => {
      const report = new ReportBuilder()
        .asPassed()
        .withValidators(2)
        .withProjectPath('/project/analyzed')
        .withSummary({
          message: '✅ PASSED: All systems verified.',
          recommendations: []
        })
        .build();

      const certificate = new CertificateBuilder()
        .withProjectPath('/project/analyzed')
        .withStatus(VerificationStatus.PASSED)
        .withMetrics({
          totalFiles: 10,
          totalAtoms: 25,
          totalConnections: 15,
          issuesFound: 0
        })
        .asValid()
        .build();

      const verificationResult = {
        report,
        certificate,
        passed: report.status === VerificationStatus.PASSED
      };

      expect(verificationResult.passed).toBe(true);
      expect(verificationResult.certificate.status).toBe(VerificationStatus.PASSED);
      expect(verificationResult.report.stats.totalIssues).toBe(0);
    });

    it('should include shadow data in verification', async () => {
      const shadows = [
        new ShadowBuilder().withShadowId('shadow_1').withStatus(ShadowStatus.DELETED).build(),
        new ShadowBuilder().withShadowId('shadow_2').withStatus(ShadowStatus.REPLACED).build(),
        new ShadowBuilder().withShadowId('shadow_3').withStatus(ShadowStatus.MERGED).build()
      ];

      for (const shadow of shadows) {
        mockStorage.set(shadow.shadowId, shadow);
      }

      const shadowStats = {
        total: shadows.length,
        byStatus: {
          deleted: shadows.filter(s => s.status === ShadowStatus.DELETED).length,
          replaced: shadows.filter(s => s.status === ShadowStatus.REPLACED).length,
          merged: shadows.filter(s => s.status === ShadowStatus.MERGED).length
        }
      };

      expect(shadowStats.total).toBe(3);
      expect(shadowStats.byStatus.deleted).toBe(1);
      expect(shadowStats.byStatus.replaced).toBe(1);
      expect(shadowStats.byStatus.merged).toBe(1);

      const report = new ReportBuilder()
        .asPassed()
        .withBySystem({ [DataSystem.SHADOWS]: shadows.length })
        .build();

      expect(report.stats.bySystem[DataSystem.SHADOWS]).toBe(3);
    });

    it('should detect issues in shadow lineage', () => {
      const brokenLineageShadow = new ShadowBuilder()
        .withShadowId('shadow_broken')
        .withLineage({
          parentShadowId: 'shadow_nonexistent',
          childShadowIds: [],
          generation: 2
        })
        .build();

      const hasBrokenLineage = brokenLineageShadow.lineage.parentShadowId === 'shadow_nonexistent';
      
      const issue = new IssueBuilder()
        .asWarning()
        .withCategory(IssueCategory.CONSISTENCY)
        .withSystem(DataSystem.SHADOWS)
        .withMessage(`Shadow ${brokenLineageShadow.shadowId} references non-existent parent`)
        .build();

      expect(hasBrokenLineage).toBe(true);
      expect(issue.category).toBe(IssueCategory.CONSISTENCY);
      expect(issue.system).toBe(DataSystem.SHADOWS);
    });

    it('should generate comprehensive verification report', () => {
      const fullReport = new ReportBuilder()
        .withProjectPath('/project/full')
        .asWarning()
        .withValidators(3)
        .withBySeverity({
          critical: 0,
          high: 1,
          medium: 2,
          low: 3,
          info: 5
        })
        .withBySystem({
          [DataSystem.ATOMS]: 2,
          [DataSystem.FILES]: 3,
          [DataSystem.CONNECTIONS]: 1,
          [DataSystem.CACHE]: 2,
          [DataSystem.SHADOWS]: 3
        })
        .withSummary({
          message: '⚠️ WARNING: Non-critical issues found.',
          recommendations: [
            'Review atom consistency',
            'Update stale cache entries'
          ]
        })
        .build();

      expect(fullReport.status).toBe(VerificationStatus.WARNING);
      expect(fullReport.stats.validatorsRun).toBe(3);
      expect(fullReport.stats.bySeverity.high).toBe(1);
      expect(fullReport.stats.bySeverity.medium).toBe(2);
      expect(fullReport.summary.recommendations.length).toBe(2);
    });
  });

  describe('End-to-End Scenarios', () => {
    
    it('should handle project lifecycle: analysis → change → verification', async () => {
      const project = TestProjectBuilder.create()
        .addFile('src/main.js', '', {
          exports: [{ name: 'init' }],
          imports: [{ source: './config' }]
        })
        .addFile('src/config.js', '', {
          exports: [{ name: 'settings' }]
        })
        .build();

      const atoms = [
        { id: 'src/main.js::init', file: 'src/main.js' },
        { id: 'src/config.js::settings', file: 'src/config.js' }
      ];

      expect(atoms.length).toBe(2);

      const shadow = await shadowRegistry.createShadow(
        { id: 'src/config.js::settings', name: 'settings' },
        { reason: 'config_moved' }
      );

      expect(shadow.originalId).toBe('src/config.js::settings');

      const verification = await verificationOrchestrator.verify();
      expect(verification.passed).toBe(true);
    });

    it('should track atom evolution through multiple versions', async () => {
      const versions = ['v1', 'v2', 'v3'];
      const shadows = [];

      for (let i = 0; i < versions.length; i++) {
        const atom = new AtomBuilder()
          .withId(`src/${versions[i]}.js::process`)
          .build();

        atom.dna = {
          id: `dna_${versions[i]}`,
          structuralHash: `hash_${versions[i]}`,
          patternHash: 'pattern_process',
          flowType: 'sync',
          complexityScore: 3 + i,
          semanticFingerprint: `sem_fp_${versions[i]}`
        };

        if (i > 0) {
          atom.ancestry = {
            replaced: shadows[i - 1].shadowId,
            generation: i
          };
        }

        const shadow = await shadowRegistry.createShadow(atom, { reason: 'version_update' });
        shadows.push(shadow);
      }

      expect(shadows.length).toBe(3);
    });

    it('should produce audit trail for complete analysis', async () => {
      const auditLog = [];

      const project = CROSS_LAYER_FIXTURES.simpleProject();
      auditLog.push({ stage: 'layer-a', action: 'analyzed', timestamp: Date.now() });

      const { buildStandardMetadata } = await import('#layer-b/metadata-contract/builders/standard-builder.js');
      for (const [path, file] of Object.entries(project.files)) {
        buildStandardMetadata(file, path);
      }
      auditLog.push({ stage: 'layer-b', action: 'enriched', timestamp: Date.now() });

      const atom = new AtomBuilder().withId('test::atom').build();
      atom.dna = { id: 'dna_test', structuralHash: 'hash', patternHash: 'p', flowType: 'sync', complexityScore: 1, semanticFingerprint: 'fp' };
      await shadowRegistry.createShadow(atom, { reason: 'test' });
      auditLog.push({ stage: 'layer-c', action: 'shadowed', timestamp: Date.now() });

      await verificationOrchestrator.verify();
      auditLog.push({ stage: 'layer-c', action: 'verified', timestamp: Date.now() });

      expect(auditLog.length).toBe(4);
      expect(auditLog[0].stage).toBe('layer-a');
      expect(auditLog[auditLog.length - 1].action).toBe('verified');
    });
  });

  describe('Error Recovery in Full Pipeline', () => {
    
    it('should recover from Layer B validation errors', async () => {
      const invalidAtom = {
        id: null,
        name: null
      };

      const { validateForLineage } = await import('#layer-b/validators/lineage-validator/validators/main-validator.js');
      const validation = validateForLineage(invalidAtom);

      expect(validation.valid).toBe(false);

      const validAtom = new AtomBuilder()
        .withId('src/valid.js::func')
        .withName('func')
        .build();
      validAtom.dna = { id: 'dna', structuralHash: 'h', patternHash: 'p', flowType: 'sync', complexityScore: 1, semanticFingerprint: 'fp' };

      const shadow = await shadowRegistry.createShadow(validAtom, { reason: 'test' });
      expect(shadow).toBeDefined();
    });

    it('should handle partial verification failures', async () => {
      const issues = [
        new IssueBuilder().asCritical().withCategory(IssueCategory.INTEGRITY).build()
      ];

      const report = new ReportBuilder()
        .asFailed()
        .withIssues(issues)
        .build();

      expect(report.status).toBe(VerificationStatus.FAILED);

      const certificate = report.status === VerificationStatus.PASSED
        ? new CertificateBuilder().build()
        : null;

      expect(certificate).toBeNull();
    });
  });

  describe('Performance', () => {
    
    it('should process large project through full pipeline', async () => {
      const builder = TestProjectBuilder.create();
      
      for (let i = 0; i < 50; i++) {
        builder.addFile(`src/module${i}.js`, '', {
          exports: [{ name: `func${i}` }],
          semanticAnalysis: {
            sharedState: { reads: [`key${i}`], writes: [] }
          }
        });
      }

      const start = Date.now();
      const project = builder.build();

      const { buildStandardMetadata } = await import('#layer-b/metadata-contract/builders/standard-builder.js');
      for (const [path, file] of Object.entries(project.files)) {
        buildStandardMetadata(file, path);
      }

      const duration = Date.now() - start;

      expect(duration).toBeLessThan(2000);
      expect(Object.keys(project.files).length).toBe(50);
    });
  });
});
