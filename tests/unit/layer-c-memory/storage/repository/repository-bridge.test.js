import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  getInstance: vi.fn(),
  isMainThread: false
}));

vi.mock('worker_threads', () => ({
  get isMainThread() {
    return h.isMainThread;
  }
}));

vi.mock('../../../../../src/layer-c-memory/storage/repository/repository-factory.js', () => ({
  RepositoryFactory: {
    getInstance: h.getInstance
  }
}));

const {
  REPOSITORY_MUTATION_DURABILITY,
  enqueueRepositoryMutation,
  flushRepositoryMutationJournal,
  getRepositoryMutationJournalSnapshot,
  runRepositoryMutation
} = await import('../../../../../src/layer-c-memory/storage/repository/repository-bridge.js');

beforeEach(() => {
  h.getInstance.mockReset();
  h.isMainThread = false;
});

describe('repository bridge', () => {
  it('retries durable mutations in worker threads instead of queueing them locally', async () => {
    const projectPath = 'C:/Dev/OmnySystem';
    const repo = {
      initialized: true,
      db: { open: true }
    };

    h.getInstance.mockReturnValue(repo);

    let attempts = 0;
    const mutation = {
      run: vi.fn(async () => {
        attempts += 1;

        if (attempts < 3) {
          const error = new Error('database is locked');
          error.code = 'SQLITE_BUSY';
          throw error;
        }

        return 'ok';
      })
    };

    const result = await runRepositoryMutation(
      projectPath,
      mutation,
      {
        durability: REPOSITORY_MUTATION_DURABILITY.DURABLE,
        retryOptions: {
          maxRetries: 4,
          baseDelayMs: 0,
          maxDelayMs: 0
        }
      }
    );

    expect(result.success).toBe(true);
    expect(result.queued).toBe(false);
    expect(result.skipped).toBe(false);
    expect(result.result).toBe('ok');
    expect(mutation.run).toHaveBeenCalledTimes(3);
  });

  it('keeps transient flush retries queued without scheduling recursively from the flush itself', async () => {
    const projectPath = 'C:/Dev/OmnySystem';
    const repo = {
      initialized: true,
      db: { open: true }
    };

    h.getInstance.mockReturnValue(repo);

    const timerSpy = vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn) => {
      return 1;
    });

    try {
      enqueueRepositoryMutation(projectPath, {
        key: 'queued-transient',
        durability: REPOSITORY_MUTATION_DURABILITY.REBUILDABLE,
        run: vi.fn(async () => {
          const error = new Error('database is locked');
          error.code = 'SQLITE_BUSY';
          throw error;
        })
      });

      timerSpy.mockClear();

      const result = await flushRepositoryMutationJournal(projectPath);
      const snapshot = getRepositoryMutationJournalSnapshot(projectPath);

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.retryable).toBe(true);
      expect(result.queued).toBe(1);
      expect(snapshot.queued).toBe(1);
      expect(timerSpy).not.toHaveBeenCalled();
    } finally {
      timerSpy.mockRestore();
    }
  });
});
