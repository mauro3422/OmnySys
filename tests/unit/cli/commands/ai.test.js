import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('#ai/llm-client.js', () => ({
  loadAIConfig: vi.fn()
}));

vi.mock('#services/llm-service/index.js', () => ({
  LLMService: {
    getInstance: vi.fn()
  }
}));

vi.mock('#cli/utils/llm.js', () => ({
  isBrainServerStarting: vi.fn(),
  isPortInUse: vi.fn()
}));

vi.mock('#cli/utils/paths.js', () => ({
  exists: vi.fn(),
  repoRoot: '/repo/root'
}));

vi.mock('child_process', () => ({
  exec: vi.fn(),
  spawn: vi.fn()
}));

vi.mock('util', () => ({
  promisify: vi.fn(() => vi.fn())
}));

const { loadAIConfig } = await import('#ai/llm-client.js');
const { LLMService } = await import('#services/llm-service/index.js');
const { isBrainServerStarting, isPortInUse } = await import('#cli/utils/llm.js');
const { exists } = await import('#cli/utils/paths.js');
const { aiLogic, ai } = await import('#cli/commands/ai.js');

describe('aiLogic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validation', () => {
    it('returns error when subcommand is null', async () => {
      const result = await aiLogic(null, { silent: true });

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.error).toContain('Invalid AI subcommand');
    });

    it('returns error when subcommand is invalid', async () => {
      const result = await aiLogic(['invalid'], { silent: true });

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.error).toContain('Invalid AI subcommand: invalid');
      expect(result.validSubcommands).toEqual(['start', 'stop', 'status']);
    });

    it('returns error when mode is invalid for start', async () => {
      const result = await aiLogic(['start', 'invalid-mode'], { silent: true });

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.error).toContain('Invalid mode: invalid-mode');
      expect(result.validModes).toEqual(['gpu', 'cpu', 'both']);
    });
  });

  describe('start', () => {
    it('starts gpu server when not running', async () => {
      vi.mocked(isBrainServerStarting).mockResolvedValue(false);
      vi.mocked(isPortInUse).mockResolvedValue(false);
      vi.mocked(exists).mockResolvedValue(true);

      const result = await aiLogic(['start', 'gpu'], { silent: true });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.mode).toBe('gpu');
      expect(result.servers.gpu.status).toBe('started');
    });

    it('detects already running gpu server', async () => {
      vi.mocked(isBrainServerStarting).mockResolvedValue(false);
      vi.mocked(isPortInUse).mockResolvedValue(true);

      const result = await aiLogic(['start', 'gpu'], { silent: true });

      expect(result.success).toBe(true);
      expect(result.servers.gpu.status).toBe('running');
    });

    it('detects server already starting', async () => {
      vi.mocked(isBrainServerStarting).mockResolvedValue(true);

      const result = await aiLogic(['start', 'gpu'], { silent: true });

      expect(result.success).toBe(true);
      expect(result.servers.gpu.status).toBe('starting');
    });

    it('starts cpu server when script exists', async () => {
      vi.mocked(exists).mockResolvedValue(true);

      const result = await aiLogic(['start', 'cpu'], { silent: true });

      expect(result.success).toBe(true);
      expect(result.servers.cpu.status).toBe('started');
    });

    it('returns error when script not found', async () => {
      vi.mocked(isBrainServerStarting).mockResolvedValue(false);
      vi.mocked(isPortInUse).mockResolvedValue(false);
      vi.mocked(exists).mockResolvedValue(false);

      const result = await aiLogic(['start', 'gpu'], { silent: true });

      expect(result.success).toBe(true);
      expect(result.servers.gpu.status).toBe('error');
    });

    it('starts both servers in both mode', async () => {
      vi.mocked(isBrainServerStarting).mockResolvedValue(false);
      vi.mocked(isPortInUse).mockResolvedValue(false);
      vi.mocked(exists).mockResolvedValue(true);

      const result = await aiLogic(['start', 'both'], { silent: true });

      expect(result.success).toBe(true);
      expect(result.servers.gpu).toBeDefined();
      expect(result.servers.cpu).toBeDefined();
    });
  });

  describe('stop', () => {
    it('returns success when servers stopped', async () => {
      const result = await aiLogic(['stop'], { silent: true });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });
  });

  describe('status', () => {
    it('returns status with health info', async () => {
      vi.mocked(loadAIConfig).mockResolvedValue({
        performance: { enableCPUFallback: true },
        llm: { enabled: true, mode: 'hybrid' }
      });

      vi.mocked(LLMService.getInstance).mockResolvedValue({
        checkHealth: vi.fn(),
        getMetrics: vi.fn().mockReturnValue({
          circuitBreakerState: 'closed',
          availability: true,
          requestsTotal: 10,
          requestsSuccessful: 9,
          latencyMsAvg: 100
        }),
        client: {
          healthCheck: vi.fn().mockResolvedValue({ gpu: true, cpu: false })
        }
      });

      const result = await aiLogic(['status'], { silent: true });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.health.gpu).toBe(true);
      expect(result.health.cpu).toBe(false);
    });

    it('handles status check failure', async () => {
      vi.mocked(loadAIConfig).mockRejectedValue(new Error('Config not found'));

      const result = await aiLogic(['status'], { silent: true });

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.error).toBe('Config not found');
    });
  });
});

describe('ai', () => {
  it('exports ai function', () => {
    expect(typeof ai).toBe('function');
  });

  it('calls process.exit with exitCode from logic', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});

    await ai('invalid');

    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });
});
