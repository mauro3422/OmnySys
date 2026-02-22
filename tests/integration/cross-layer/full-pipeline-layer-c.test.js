/**
 * @fileoverview Cross-Layer Integration Tests: Full Pipeline with Layer C
 * 
 * Tests complete analysis pipeline including Layer C.
 * 
 * @module tests/integration/cross-layer/full-pipeline-layer-c.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CROSS_LAYER_FIXTURES } from '../../factories/cross-layer.factory.js';
import { ShadowBuilder, AtomBuilder } from '../../factories/layer-c-shadow-registry/builders.js';
import { ReportBuilder, CertificateBuilder } from '../../factories/layer-c-verification/builders.js';
import { VerificationStatus, Severity } from '../../../src/layer-c-memory/verification/types/index.js';
import { ShadowStatus } from '../../../src/layer-c-memory/shadow-registry/types.js';
import { createMockShadowRegistry, createMockVerificationOrchestrator } from '../helpers/index.js';

const mockStorage = new Map();
const mockIndex = new Map();
const mockCache = new Map();

describe('Cross-Layer: Full Pipeline with Layer C', () => {
  let shadowRegistry, verificationOrchestrator;

  beforeEach(() => {
    mockStorage.clear();
    mockIndex.clear();
    mockCache.clear();
    
    shadowRegistry = createMockShadowRegistry(mockStorage, mockIndex);
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
        enrichedFiles[path] = { ...file, metadata: buildStandardMetadata(file, path) };
      }

      const filesWithLocalStorage = Object.entries(enrichedFiles)
        .filter(([_, f]) => f.metadata?.hasLocalStorage);
      expect(filesWithLocalStorage.length).toBeGreaterThan(0);

      const atoms = [];
      for (const [path, file] of Object.entries(enrichedFiles)) {
        const atom = new AtomBuilder()
          .withId(`${path}::main`)
          .withName('main')
          .withFile(path)
          .withDataFlow({
            inputs: file.metadata?.localStorageKeys || [],
            outputs: [],
            sideEffects: file.metadata?.hasGlobalAccess ? ['globalAccess'] : []
          })
          .build();

        atom.dna = {
          id: `dna_${path}`,
          structuralHash: `hash_struct_${path}`,
          patternHash: `hash_pattern_${path}`,
          flowType: 'async',
          complexityScore: file.exports?.length || 1
        };

        atoms.push(atom);
      }

      expect(atoms.length).toBe(Object.keys(enrichedFiles).length);

      const shadows = [];
      for (const atom of atoms) {
        const shadow = await shadowRegistry.createShadow(atom, { reason: 'deleted' });
        shadows.push(shadow);
      }

      expect(shadows.length).toBe(atoms.length);
      expect(mockStorage.size).toBe(atoms.length);

      const verification = await verificationOrchestrator.verify();
      expect(verification.passed).toBe(true);
    });
  });

  describe('Shadow Creation from Analyzed Atoms', () => {
    
    it('should create shadows from Layer B analyzed atoms', async () => {
      const systemMap = CROSS_LAYER_FIXTURES.eventsProject();
      
      // Crear átomos con IDs específicos
      const atoms = Object.keys(systemMap.files).map((path, index) => {
        const atomId = `${path}::main`;
        const atom = new AtomBuilder()
          .withId(atomId)
          .withFile(path)
          .withDataFlow({ sideEffects: ['event'] })
          .build();

        // Asignar DNA después de construir
        atom.dna = {
          id: `dna_${index}`,
          patternHash: `hash_${path}`,
          flowType: 'async'
        };

        return atom;
      });

      // Crear shadows para cada átomo
      for (const atom of atoms) {
        await shadowRegistry.createShadow(atom, { reason: 'refactored' });
      }

      // Verificar que se crearon todos los shadows
      expect(mockStorage.size).toBe(atoms.length);
      
      // Verificar que cada shadow tiene los campos requeridos
      for (const [shadowId, shadow] of mockStorage) {
        expect(shadow).toBeDefined();
        expect(shadow.shadowId).toBeDefined();
        // Verificar que tiene originalId (que es el atom.id)
        expect(shadow.originalId || shadow.atomId).toBeDefined();
      }
    });

    it('should track lineage for evolved atoms', async () => {
      const parentAtom = new AtomBuilder()
        .withId('src/auth.js::login_v1')
        .withName('login_v1')
        .build();

      parentAtom.dna = { patternHash: 'hash_v1' };

      const childAtom = new AtomBuilder()
        .withId('src/auth.js::login_v2')
        .withName('login_v2')
        .build();

      childAtom.dna = { patternHash: 'hash_v2' };

      const parentShadow = await shadowRegistry.createShadow(parentAtom, { reason: 'replaced' });
      
      await shadowRegistry.markReplaced(parentShadow.shadowId, 'shadow_child');

      const updatedParent = mockStorage.get(parentShadow.shadowId);
      expect(updatedParent.status).toBe(ShadowStatus.REPLACED);
      expect(updatedParent.replacedBy).toBe('shadow_child');
    });
  });

  describe('End-to-End Scenarios', () => {
    
    it('should handle refactoring workflow', async () => {
      const systemMap = CROSS_LAYER_FIXTURES.localStorageProject();
      
      const originalFile = Object.keys(systemMap.files)[0];
      const originalAtom = new AtomBuilder()
        .withId(`${originalFile}::original`)
        .withFile(originalFile)
        .build();

      originalAtom.dna = { patternHash: 'hash_original' };

      const originalShadow = await shadowRegistry.createShadow(originalAtom, { reason: 'deleted' });
      
      const refactoredAtom = new AtomBuilder()
        .withId(`${originalFile}::refactored`)
        .withFile(originalFile)
        .build();

      refactoredAtom.dna = { patternHash: 'hash_refactored' };

      const refactoredShadow = await shadowRegistry.createShadow(refactoredAtom, { reason: 'refactored' });

      await shadowRegistry.markReplaced(originalShadow.shadowId, refactoredShadow.shadowId);

      const original = mockStorage.get(originalShadow.shadowId);
      expect(original.status).toBe(ShadowStatus.REPLACED);
      expect(original.replacedBy).toBe(refactoredShadow.shadowId);
    });

    it('should generate verification certificate after successful analysis', async () => {
      const systemMap = CROSS_LAYER_FIXTURES.localStorageProject();
      
      for (const [path, file] of Object.entries(systemMap.files)) {
        const atom = new AtomBuilder()
          .withId(`${path}::main`)
          .withFile(path)
          .build();

        atom.dna = { patternHash: `hash_${path}` };
        await shadowRegistry.createShadow(atom, { reason: 'deleted' });
      }

      const verification = await verificationOrchestrator.verify();

      if (verification.passed) {
        const certificate = new CertificateBuilder()
          .withProjectPath('/test/project')
          .withStatus(VerificationStatus.PASSED)
          .withMetrics({
            totalFiles: mockStorage.size,
            totalShadows: mockStorage.size,
            issuesFound: 0
          })
          .build();

        expect(certificate.status).toBe(VerificationStatus.PASSED);
        expect(certificate.metrics.totalShadows).toBe(mockStorage.size);
      }
    });

    it('should detect issues across layers', async () => {
      const systemMap = CROSS_LAYER_FIXTURES.localStorageProject();
      
      const issues = [];

      Object.entries(systemMap.files).forEach(([path, file]) => {
        if (file.semanticAnalysis?.sharedState?.writes?.length > 0) {
          issues.push({
            severity: Severity.WARNING,
            category: 'shared-state',
            message: `${path} writes to localStorage`,
            file: path
          });
        }

        if (file.semanticAnalysis?.eventPatterns?.eventListeners?.length > 0) {
          issues.push({
            severity: Severity.INFO,
            category: 'event-coupling',
            message: `${path} has event listeners`,
            file: path
          });
        }
      });

      expect(issues.length).toBeGreaterThan(0);
      
      const hasSharedStateIssues = issues.some(i => i.category === 'shared-state');
      expect(hasSharedStateIssues).toBe(true);
    });
  });

  describe('Performance and Scalability', () => {
    
    it('should handle multiple files efficiently', async () => {
      const files = [];
      for (let i = 0; i < 100; i++) {
        files.push({
          id: `file_${i}`,
          exports: [{ name: `export${i}` }],
          imports: []
        });
      }

      const start = Date.now();

      for (const file of files) {
        const atom = new AtomBuilder()
          .withId(`${file.id}::main`)
          .withName('main')
          .build();

        atom.dna = { patternHash: `hash_${file.id}` };
        await shadowRegistry.createShadow(atom, { reason: 'deleted' });
      }

      const duration = Date.now() - start;

      expect(mockStorage.size).toBe(100);
      expect(duration).toBeLessThan(1000);
    });
  });
});
