import { defineGuard, defineVersionedLazyGuard, loadGuardMember } from './guard-definition-factory.js';

export const impactGuardDefinitionsCore = [
  defineGuard(
    'impact-wave',
    async () => {
      const detectImpactWave = await loadGuardMember(
        () => import('./impact-wave.js'),
        (mod) => mod.detectImpactWave
      );
      return async (rootPath, filePath, context, options) => {
        const previousAtoms = options.previousAtoms || [];
        return detectImpactWave(rootPath, filePath, previousAtoms, context, async (fp) => context.getAtomsForFile(fp), options);
      };
    },
    { domain: 'arch', version: '2.0.0', description: 'Analyzes blast radius of changes (impact wave)' }
  ),
  defineVersionedLazyGuard(
    'duplicate-risk',
    () => import('./duplicate-risk.js'),
    (mod) => mod.detectDuplicateRisk,
    'code',
    '2.0.0',
    'Detects duplicate symbols by DNA hash'
  ),
  defineGuard(
    'circular-dependencies',
    async () => {
      const detectCircularDependencies = await loadGuardMember(
        () => import('./circular-guard.js'),
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
