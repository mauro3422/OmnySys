import { getRepository } from '#layer-c/storage/repository/index.js';
import { saveEnhancedSystemMap, printSummary } from './pipeline/save.js';
import { PipelineRunner } from './pipeline/runner.js';

function buildAtomsByFile(atoms) {
  const atomsByFile = {};
  for (const atom of atoms) {
    if (!atomsByFile[atom.file_path]) {
      atomsByFile[atom.file_path] = { atoms: [], atomCount: 0 };
    }
    atomsByFile[atom.file_path].atoms.push(atom);
    atomsByFile[atom.file_path].atomCount++;
  }
  return atomsByFile;
}

export function buildRefreshPatternsRunner({ absoluteRootPath, verbose, logger }) {
  const repo = getRepository(absoluteRootPath);
  const runner = new PipelineRunner({ absoluteRootPath, verbose });

  runner
    .addPhase('1. Load State', async () => {
      const systemMap = await repo.loadSystemMap();
      const atoms = repo.getAll({ limit: 0 });
      return { systemMap, atomsByFile: buildAtomsByFile(atoms) };
    })
    .addPhase('2. Re-run Quality Analysis', async (ctx) => {
      const { generateAnalysisReport } = await import('./analyzer.js');
      const { enhanceSystemMap } = await import('./pipeline/enhancers/index.js');

      const [analysisReport, enhancedSystemMap] = await Promise.all([
        generateAnalysisReport(ctx.systemMap),
        enhanceSystemMap(ctx.absoluteRootPath, ctx.atomsByFile, ctx.systemMap, ctx.verbose)
      ]);

      return { analysisReport, enhancedSystemMap };
    })
    .addPhase('3. Persist Findings', async (ctx) => {
      await saveEnhancedSystemMap(ctx.enhancedSystemMap, ctx.verbose, ctx.absoluteRootPath);

      if (ctx.verbose) {
        printSummary({
          systemMap: ctx.systemMap,
          analysisReport: ctx.analysisReport,
          enhancedSystemMap: ctx.enhancedSystemMap
        });
      }
    });

  if (verbose) {
    logger.info('\nRefreshing patterns from existing database atoms...');
  }

  return runner;
}
