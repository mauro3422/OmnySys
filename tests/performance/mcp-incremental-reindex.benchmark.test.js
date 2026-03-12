import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { performance } from 'perf_hooks';
import { StrategyExecutor } from '../../src/layer-c-memory/mcp/core/analysis-checker/strategy-executor.js';
import { IndexingStrategy } from '../../src/layer-c-memory/mcp/core/analysis-checker/strategies/indexing-strategy.js';

async function createTempProject() {
  const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'omnysys-perf-'));
  await fs.mkdir(path.join(projectDir, 'src'), { recursive: true });
  const filePath = path.join(projectDir, 'src', 'worker.js');
  await fs.writeFile(filePath, 'export function workerTask(input) { return input + 1; }\n', 'utf8');
  return { projectDir, filePath };
}

describe('Performance: incremental reindex', () => {
  it('re-analyzes a small changed set within a bounded budget', async () => {
    const { projectDir, filePath } = await createTempProject();

    try {
      const executor = new StrategyExecutor(projectDir, null);
      const startedAt = performance.now();
      const result = await executor.execute(
        {
          strategy: IndexingStrategy.INCREMENTAL,
          metrics: { totalFiles: 1 }
        },
        {
          newFiles: [],
          modifiedFiles: [filePath],
          deletedFiles: []
        },
        async () => {}
      );
      const elapsedMs = performance.now() - startedAt;

      expect(result.strategy).toBe(IndexingStrategy.INCREMENTAL);
      expect(result.filesAnalyzed).toBe(1);
      expect(result.incremental).toBe(true);
      expect(elapsedMs).toBeLessThan(5000);
    } finally {
      await fs.rm(projectDir, { recursive: true, force: true });
    }
  });
});
