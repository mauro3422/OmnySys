import { defineGuard, defineVersionedLazyGuard, loadGuardMember } from './guard-definition-factory.js';

export const impactGuardDefinitionsCore = [
  defineGuard(
    'impact-wave',
    async () => {
      const detectImpactWave = await loadGuardMember(
        () => import('./impact-wave/index.js'),
        (mod) => mod.detectImpactWave
      );
      return async (rootPath, filePath, context, options) => {
        const previousAtoms = options.previousAtoms || [];
        return detectImpactWave(rootPath, filePath, previousAtoms, context, async (fp) => context.getAtomsForFile(fp), options);
      };
    },
    { domain: 'arch', version: '2.0.0', description: 'Analyzes blast radius of changes (impact wave)' }
  ),
  defineGuard(
    'duplicate-risk',
    async () => {
      const mod = await loadGuardMember(
        () => import('./duplicate-risk/detection.js'),
        (m) => m.runStructuralDuplicateDetection
      );
      return async (rootPath, filePath, context, options = {}) => {
        const { getRepository } = await import('#layer-c/storage/repository/index.js');
        const repo = getRepository(rootPath);
        if (!repo?.db) {
          return [];
        }
        return mod({
          repo,
          normalizedFilePath: filePath,
          providedAtoms: options.previousAtoms || null,
          minLinesOfCode: options.minLinesOfCode || 4,
          maxFindings: options.maxFindings || 8,
          duplicateMode: 'structural',
          duplicateKeySql: options.duplicateKeySql || null
        });
      };
    },
    { domain: 'code', version: '2.0.0', description: 'Detects duplicate symbols by DNA hash' }
  ),
  defineGuard(
    'circular-dependencies',
    async () => {
      const detectCircularDependencies = await loadGuardMember(
        () => import('./circular-guard/index.js'),
        (mod) => mod.detectCircularDependencies
      );
      return async (rootPath, filePath) => {
        const { getRepository } = await import('#layer-c/storage/repository/index.js');
        return detectCircularDependencies(rootPath, filePath, getRepository(rootPath));
      };
    },
    { domain: 'arch', version: '2.0.0', description: 'Detects circular import and call dependencies' }
  )
];
