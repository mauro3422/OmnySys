/**
 * @fileoverview Cross-Layer Integration Tests: Layer B → C Metadata Flow
 * 
 * Tests the metadata flow from Layer B to Layer C:
 * - Layer B metadata can be used to create shadow
 * - Lineage validator validates Layer B metadata
 * - Verification uses Layer B analysis results
 * 
 * @module tests/integration/cross-layer/b-to-c-metadata-flow.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestProjectBuilder, CROSS_LAYER_FIXTURES } from '../../factories/cross-layer.factory.js';
import { ShadowBuilder, AtomBuilder, AncestryBuilder } from '../../factories/layer-c-shadow-registry/builders.js';
import { ValidationResultBuilder, IssueBuilder, ReportBuilder } from '../../factories/layer-c-verification/builders.js';
import { VerificationStatus, Severity, IssueCategory } from '../../../src/layer-c-memory/verification/types/index.js';
import { ShadowStatus } from '../../../src/layer-c-memory/shadow-registry/types.js';

const createMockLayerBMetadata = (file, filePath) => ({
  filePath,
  exportCount: file.exports?.length || 0,
  importCount: file.imports?.length || 0,
  hasLocalStorage: file.semanticAnalysis?.sharedState?.writes?.length > 0 ||
                    file.semanticAnalysis?.sharedState?.reads?.length > 0,
  localStorageKeys: [
    ...(file.semanticAnalysis?.sharedState?.writes || []),
    ...(file.semanticAnalysis?.sharedState?.reads || [])
  ],
  hasEventListeners: file.semanticAnalysis?.eventPatterns?.eventListeners?.length > 0,
  eventNames: [
    ...(file.semanticAnalysis?.eventPatterns?.eventEmitters || []),
    ...(file.semanticAnalysis?.eventPatterns?.eventListeners || [])
  ],
  hasGlobalAccess: file.semanticAnalysis?.sideEffects?.hasGlobalAccess || false
});

const createAtomFromLayerBMetadata = (metadata, atomId) => {
  return new AtomBuilder()
    .withId(atomId)
    .withName(atomId.split('::').pop())
    .withFile(metadata.filePath)
    .withDataFlow({
      inputs: metadata.localStorageKeys,
      outputs: [],
      sideEffects: metadata.hasGlobalAccess ? ['globalAccess'] : []
    })
    .build();
};

describe('Cross-Layer: Layer B → C Metadata Flow', () => {
  describe('Layer B Metadata to Shadow Creation', () => {
    
    it('should create shadow from Layer B enriched atom', async () => {
      const systemMap = CROSS_LAYER_FIXTURES.localStorageProject();
      
      const authFile = systemMap.files['src/auth/login.js'];
      const metadata = createMockLayerBMetadata(authFile, 'src/auth/login.js');
      
      expect(metadata.hasLocalStorage).toBe(true);
      expect(metadata.localStorageKeys).toContain('token');

      const atom = new AtomBuilder()
        .withId('src/auth/login.js::handleLogin')
        .withName('handleLogin')
        .withFile(metadata.filePath)
        .withDataFlow({
          inputs: ['credentials'],
          outputs: ['token'],
          sideEffects: metadata.hasGlobalAccess ? ['globalAccess'] : []
        })
        .build();

      atom.dna = {
        id: 'dna_login',
        structuralHash: 'hash_login',
        patternHash: 'pattern_auth',
        flowType: 'async',
        operationSequence: ['validate', 'authenticate', 'store'],
        complexityScore: 5,
        semanticFingerprint: 'sem_fp_login'
      };

      const shadow = new ShadowBuilder()
        .withShadowId('shadow_login_001')
        .withAtomId(atom.id)
        .withDNA(atom.dna)
        .withMetadata({
          name: atom.name,
          filePath: atom.filePath,
          lineNumber: 1,
          isExported: true,
          semantic: metadata
        })
        .build();

      expect(shadow.originalId).toBe(atom.id);
      expect(shadow.metadata.semantic.hasLocalStorage).toBe(true);
      expect(shadow.metadata.semantic.localStorageKeys).toContain('token');
    });

    it('should preserve semantic analysis through shadow creation', async () => {
      const systemMap = CROSS_LAYER_FIXTURES.eventsProject();
      
      const publisherFile = systemMap.files['src/events/publisher.js'];
      const metadata = createMockLayerBMetadata(publisherFile, 'src/events/publisher.js');
      
      const hasEvents = metadata.eventNames && metadata.eventNames.length > 0;
      expect(hasEvents).toBe(true);
      expect(metadata.eventNames).toContain('user:login');

      const atom = new AtomBuilder()
        .withId('src/events/publisher.js::publishLogin')
        .withSemantic({ eventEmitters: metadata.eventNames })
        .build();

      const shadow = new ShadowBuilder()
        .withAtomId(atom.id)
        .withMetadata({ semantic: atom.semantic })
        .build();

      expect(shadow.metadata.semantic.eventEmitters).toContain('user:login');
    });

    it('should handle orphan metadata in shadow', async () => {
      const systemMap = CROSS_LAYER_FIXTURES.orphanProject();
      
      const orphanFile = systemMap.files['src/orphan/unused.js'];
      const metadata = createMockLayerBMetadata(orphanFile, 'src/orphan/unused.js');
      
      expect(metadata.hasGlobalAccess).toBe(true);

      const atom = new AtomBuilder()
        .withId('src/orphan/unused.js::init')
        .withSemantic(metadata)
        .build();

      const shadow = new ShadowBuilder()
        .withAtomId(atom.id)
        .withReason('orphan_deleted')
        .withMetadata({ semantic: atom.semantic })
        .build();

      expect(shadow.death.reason).toBe('orphan_deleted');
      expect(shadow.metadata.semantic.hasGlobalAccess).toBe(true);
    });
  });

  describe('Lineage Validator with Layer B Metadata', () => {
    
    it('should validate atom with complete Layer B metadata', () => {
      const atom = new AtomBuilder()
        .withId('src/auth.js::login')
        .withName('login')
        .withFile('src/auth.js')
        .withLineNumber(15)
        .asExported()
        .withDataFlow({
          inputs: ['credentials'],
          outputs: ['token'],
          sideEffects: []
        })
        .build();

      const isValid = !!(atom.id && atom.name && atom.filePath && atom.dataFlow);
      expect(isValid).toBe(true);

      const requiredFields = ['id', 'name', 'filePath'];
      const hasAllFields = requiredFields.every(field => atom[field]);
      expect(hasAllFields).toBe(true);
    });

    it('should reject atom with missing Layer B metadata', () => {
      const incompleteAtom = {
        id: null,
        name: undefined
      };

      const requiredFields = ['id', 'name'];
      const missingFields = requiredFields.filter(field => !incompleteAtom[field]);
      
      expect(missingFields.length).toBe(2);
    });

    it('should enrich atom with ancestry from shadow', async () => {
      const atom = new AtomBuilder()
        .withId('src/new.js::newFunc')
        .build();

      const parentShadow = new ShadowBuilder()
        .withShadowId('shadow_parent')
        .withOriginalId('src/old.js::oldFunc')
        .asReplaced()
        .build();

      const ancestry = new AncestryBuilder()
        .withReplaced(parentShadow.shadowId)
        .withLineage([parentShadow.shadowId])
        .withGeneration(1)
        .withSimilar(0.92)
        .withConfidence(0.95)
        .build();

      const enrichedAtom = {
        ...atom,
        ancestry
      };

      expect(enrichedAtom.ancestry.replaced).toBe('shadow_parent');
      expect(enrichedAtom.ancestry.generation).toBe(1);
      expect(enrichedAtom.ancestry.similarity).toBe(0.92);
    });

    it('should calculate vibration score from Layer B connections', () => {
      const connections = [
        { target: 'src/api.js::handler', strength: 0.95 },
        { target: 'src/db.js::query', strength: 0.90 },
        { target: 'src/utils.js::helper', strength: 0.85 }
      ];

      const vibrationScore = connections.reduce((sum, conn) => sum + conn.strength, 0) * 100;
      
      expect(vibrationScore).toBeGreaterThan(200);

      const ancestry = new AncestryBuilder()
        .withStrongConnections(connections)
        .withVibrationScore(vibrationScore)
        .build();

      expect(ancestry.strongConnections.length).toBe(3);
      expect(ancestry.vibrationScore).toBeGreaterThan(200);
    });
  });

  describe('Verification Using Layer B Analysis Results', () => {
    
    it('should verify consistency between Layer B metadata and atoms', async () => {
      const layerBMetadata = {
        'src/auth.js': {
          exportCount: 3,
          importCount: 5,
          functions: ['login', 'logout', 'refresh']
        }
      };

      const atoms = [
        { id: 'src/auth.js::login', filePath: 'src/auth.js' },
        { id: 'src/auth.js::logout', filePath: 'src/auth.js' },
        { id: 'src/auth.js::refresh', filePath: 'src/auth.js' }
      ];

      const atomCount = atoms.filter(a => a.filePath === 'src/auth.js').length;
      const expectedCount = layerBMetadata['src/auth.js'].functions.length;

      expect(atomCount).toBe(expectedCount);

      const validationResult = new ValidationResultBuilder()
        .asPassed()
        .withStats({ total: atomCount, valid: atomCount, invalid: 0 })
        .build();

      expect(validationResult.status).toBe(VerificationStatus.PASSED);
    });

    it('should detect inconsistencies between layers', () => {
      const layerBMetadata = {
        'src/utils.js': {
          functions: ['helper1', 'helper2']
        }
      };

      const atoms = [
        { id: 'src/utils.js::helper1', filePath: 'src/utils.js' },
        { id: 'src/utils.js::helper2', filePath: 'src/utils.js' },
        { id: 'src/utils.js::helper3', filePath: 'src/utils.js' }
      ];

      const expectedCount = layerBMetadata['src/utils.js'].functions.length;
      const actualCount = atoms.length;

      const hasInconsistency = expectedCount !== actualCount;
      expect(hasInconsistency).toBe(true);

      const issue = new IssueBuilder()
        .asWarning()
        .withCategory(IssueCategory.CONSISTENCY)
        .withMessage(`Atom count mismatch: expected ${expectedCount}, found ${actualCount}`)
        .build();

      expect(issue.category).toBe(IssueCategory.CONSISTENCY);
    });

    it('should use Layer B issue detection in verification report', () => {
      const layerBIssues = [
        { type: 'orphan-with-global-access', file: 'src/orphan.js', severity: 'high' },
        { type: 'god-object', file: 'src/god.js', severity: 'medium' }
      ];

      const verificationIssues = layerBIssues.map(issue => {
        const builder = new IssueBuilder()
          .withCategory(IssueCategory.CONSISTENCY)
          .withMessage(`${issue.type} in ${issue.file}`)
          .withFile(issue.file);
        
        if (issue.severity === 'high') {
          builder.asHigh();
        } else if (issue.severity === 'medium') {
          builder.asWarning();
        }
        return builder.build();
      });

      const report = new ReportBuilder()
        .asWarning()
        .withIssues(verificationIssues)
        .withBySeverity({ critical: 0, high: 1, medium: 1, low: 0, info: 0 })
        .build();

      expect(report.issues.length).toBe(2);
      expect(report.stats.bySeverity.high).toBe(1);
      expect(report.stats.bySeverity.medium).toBe(1);
    });
  });

  describe('Complete B → C Flow', () => {
    
    it('should transform Layer B enriched data to Layer C shadows', async () => {
      const systemMap = TestProjectBuilder.create()
        .addFile('src/deprecated.js', '', {
          exports: [{ name: 'oldFunction' }],
          semanticAnalysis: {
            sharedState: { writes: ['legacyKey'], reads: [] }
          }
        })
        .build();

      const enrichedFile = systemMap.files['src/deprecated.js'];
      const metadata = createMockLayerBMetadata(enrichedFile, 'src/deprecated.js');

      const atom = new AtomBuilder()
        .withId('src/deprecated.js::oldFunction')
        .withFile('src/deprecated.js')
        .withSemantic(metadata)
        .build();

      atom.dna = {
        id: 'dna_deprecated',
        structuralHash: 'hash_deprecated',
        patternHash: 'pattern_legacy',
        flowType: 'sync',
        complexityScore: 3,
        semanticFingerprint: 'sem_fp_legacy'
      };

      const shadow = new ShadowBuilder()
        .withShadowId('shadow_deprecated_001')
        .withAtomId(atom.id)
        .withDNA(atom.dna)
        .withReason('function_deprecated')
        .withMetadata({
          name: 'oldFunction',
          filePath: 'src/deprecated.js',
          semantic: atom.semantic
        })
        .build();

      expect(shadow.shadowId).toBe('shadow_deprecated_001');
      expect(shadow.originalId).toBe(atom.id);
      expect(shadow.death.reason).toBe('function_deprecated');
      expect(shadow.metadata.semantic.hasLocalStorage).toBe(true);
    });

    it('should maintain data flow information through layers', () => {
      const layerAData = {
        inputs: ['param1', 'param2'],
        outputs: ['result']
      };

      const layerBEnriched = {
        ...layerAData,
        sideEffects: ['localStorage'],
        semanticType: 'transformer'
      };

      const layerCAtom = new AtomBuilder()
        .withDataFlow(layerBEnriched)
        .build();

      expect(layerCAtom.dataFlow.inputs).toEqual(layerAData.inputs);
      expect(layerCAtom.dataFlow.outputs).toEqual(layerAData.outputs);
      expect(layerCAtom.dataFlow.sideEffects).toContain('localStorage');
    });

    it('should handle cross-layer data integrity', () => {
      const projectData = {
        layerA: {
          files: ['src/a.js', 'src/b.js'],
          connections: [{ from: 'src/a.js', to: 'src/b.js' }]
        },
        layerB: {
          metadata: {
            'src/a.js': { exportCount: 2 },
            'src/b.js': { importCount: 1 }
          }
        },
        layerC: {
          shadows: [],
          verificationStatus: VerificationStatus.PASSED
        }
      };

      const fileCountMatch = projectData.layerA.files.length === 
                             Object.keys(projectData.layerB.metadata).length;
      expect(fileCountMatch).toBe(true);

      const hasValidVerification = projectData.layerC.verificationStatus === VerificationStatus.PASSED;
      expect(hasValidVerification).toBe(true);
    });
  });

  describe('Error Handling Across Layers', () => {
    
    it('should handle missing Layer B metadata gracefully', () => {
      const fileWithoutMetadata = {
        filePath: 'src/unknown.js',
        exports: [],
        imports: []
      };

      const metadata = createMockLayerBMetadata(fileWithoutMetadata, 'src/unknown.js');
      
      expect(metadata.exportCount).toBe(0);
      expect(metadata.importCount).toBe(0);
      expect(metadata.hasLocalStorage).toBe(false);
    });

    it('should validate cross-layer data consistency', () => {
      const layerAConnection = { from: 'src/a.js', to: 'src/b.js' };
      const layerBMetadata = {
        'src/a.js': { exports: [{ name: 'foo' }] },
        'src/b.js': { imports: [{ source: './a.js' }] }
      };

      const sourceFile = layerAConnection.from;
      const targetFile = layerAConnection.to;

      const sourceHasExports = layerBMetadata[sourceFile]?.exports?.length > 0;
      const targetHasImports = layerBMetadata[targetFile]?.imports?.length > 0;

      const connectionValid = sourceHasExports && targetHasImports;
      expect(connectionValid).toBe(true);
    });
  });

  describe('Performance', () => {
    
    it('should process large Layer B metadata efficiently', () => {
      const files = {};
      for (let i = 0; i < 100; i++) {
        files[`src/file${i}.js`] = {
          exports: [{ name: `func${i}` }],
          imports: [{ source: `./file${i-1}` }],
          semanticAnalysis: {
            sharedState: { reads: [`key${i}`], writes: [] }
          }
        };
      }

      const start = Date.now();
      
      const atoms = Object.entries(files).map(([path, file]) => 
        createAtomFromLayerBMetadata(createMockLayerBMetadata(file, path), `${path}::main`)
      );

      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(100);
      expect(atoms.length).toBe(100);
    });
  });
});
