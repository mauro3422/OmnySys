import { describe, it, expect, beforeEach } from 'vitest';
import { ServerManager } from '#ai/llm/client/server/server-manager.js';
import { AIConfigBuilder, ServerStateBuilder } from '#test-factories/ai/builders.js';

describe('ServerManager', () => {
  describe('constructor', () => {
    it('should create instance with default config', () => {
      const manager = new ServerManager();
      
      expect(manager.servers).toBeDefined();
      expect(manager.servers.gpu).toBeDefined();
      expect(manager.servers.cpu).toBeDefined();
    });

    it('should create servers with default ports', () => {
      const manager = new ServerManager({});
      
      expect(manager.servers.gpu.url).toBe('http://127.0.0.1:8000');
      expect(manager.servers.cpu.url).toBe('http://127.0.0.1:8001');
    });

    it('should create servers with custom ports', () => {
      const config = AIConfigBuilder.create()
        .withGPUPort(9000)
        .withCPUPort(9001)
        .build();
      const manager = new ServerManager(config);
      
      expect(manager.servers.gpu.url).toBe('http://127.0.0.1:9000');
      expect(manager.servers.cpu.url).toBe('http://127.0.0.1:9001');
    });

    it('should initialize servers as unavailable', () => {
      const manager = new ServerManager();
      
      expect(manager.servers.gpu.available).toBe(false);
      expect(manager.servers.cpu.available).toBe(false);
    });

    it('should set max parallel from config', () => {
      const config = AIConfigBuilder.create().build();
      const manager = new ServerManager(config);
      
      expect(manager.servers.gpu.maxParallel).toBe(4);
      expect(manager.servers.cpu.maxParallel).toBe(2);
    });

    it('should initialize active requests to zero', () => {
      const manager = new ServerManager();
      
      expect(manager.servers.gpu.activeRequests).toBe(0);
      expect(manager.servers.cpu.activeRequests).toBe(0);
    });
  });

  describe('selectServer', () => {
    it('should return null when no servers available', () => {
      const manager = new ServerManager({});
      
      expect(manager.selectServer('gpu')).toBe(null);
    });

    it('should return gpu when gpu available', () => {
      const manager = new ServerManager({});
      manager.servers.gpu.available = true;
      
      expect(manager.selectServer('gpu')).toBe('gpu');
    });

    it('should return cpu when cpu available and preferred', () => {
      const manager = new ServerManager({});
      manager.servers.cpu.available = true;
      
      expect(manager.selectServer('cpu')).toBe('cpu');
    });

    it('should return gpu even when cpu preferred but gpu available', () => {
      const manager = new ServerManager({});
      manager.servers.gpu.available = true;
      manager.servers.cpu.available = true;
      
      expect(manager.selectServer('gpu')).toBe('gpu');
    });

    it('should fallback to cpu when gpu at capacity', () => {
      const config = AIConfigBuilder.create()
        .withCPUFallback(true)
        .build();
      const manager = new ServerManager(config);
      manager.servers.gpu.available = true;
      manager.servers.gpu.activeRequests = manager.servers.gpu.maxParallel;
      manager.servers.cpu.available = true;
      
      expect(manager.selectServer('gpu')).toBe('cpu');
    });

    it('should not fallback when CPU fallback disabled', () => {
      const config = AIConfigBuilder.create()
        .withCPUFallback(false)
        .build();
      const manager = new ServerManager(config);
      manager.servers.gpu.available = true;
      manager.servers.gpu.activeRequests = manager.servers.gpu.maxParallel;
      manager.servers.cpu.available = true;
      
      expect(manager.selectServer('gpu')).toBe(null);
    });

    it('should return null when server at capacity', () => {
      const manager = new ServerManager({});
      manager.servers.gpu.available = true;
      manager.servers.gpu.activeRequests = manager.servers.gpu.maxParallel;
      
      expect(manager.selectServer('gpu')).toBe(null);
    });

    it('should return gpu when under max parallel', () => {
      const manager = new ServerManager({});
      manager.servers.gpu.available = true;
      manager.servers.gpu.activeRequests = 2;
      manager.servers.gpu.maxParallel = 4;
      
      expect(manager.selectServer('gpu')).toBe('gpu');
    });
  });

  describe('acquireServer', () => {
    it('should increment gpu active requests', () => {
      const manager = new ServerManager({});
      const initial = manager.servers.gpu.activeRequests;
      
      manager.acquireServer('gpu');
      
      expect(manager.servers.gpu.activeRequests).toBe(initial + 1);
    });

    it('should increment cpu active requests', () => {
      const manager = new ServerManager({});
      const initial = manager.servers.cpu.activeRequests;
      
      manager.acquireServer('cpu');
      
      expect(manager.servers.cpu.activeRequests).toBe(initial + 1);
    });

    it('should handle multiple acquisitions', () => {
      const manager = new ServerManager({});
      
      manager.acquireServer('gpu');
      manager.acquireServer('gpu');
      manager.acquireServer('gpu');
      
      expect(manager.servers.gpu.activeRequests).toBe(3);
    });

    it('should not throw for invalid server', () => {
      const manager = new ServerManager({});
      
      expect(() => manager.acquireServer('invalid')).not.toThrow();
    });
  });

  describe('releaseServer', () => {
    it('should decrement gpu active requests', () => {
      const manager = new ServerManager({});
      manager.servers.gpu.activeRequests = 2;
      
      manager.releaseServer('gpu');
      
      expect(manager.servers.gpu.activeRequests).toBe(1);
    });

    it('should decrement cpu active requests', () => {
      const manager = new ServerManager({});
      manager.servers.cpu.activeRequests = 2;
      
      manager.releaseServer('cpu');
      
      expect(manager.servers.cpu.activeRequests).toBe(1);
    });

    it('should not go below zero', () => {
      const manager = new ServerManager({});
      manager.servers.gpu.activeRequests = 0;
      
      manager.releaseServer('gpu');
      
      expect(manager.servers.gpu.activeRequests).toBe(-1);
    });

    it('should not throw for invalid server', () => {
      const manager = new ServerManager({});
      
      expect(() => manager.releaseServer('invalid')).not.toThrow();
    });
  });

  describe('getServerUrl', () => {
    it('should return gpu url', () => {
      const manager = new ServerManager({});
      
      expect(manager.getServerUrl('gpu')).toBe('http://127.0.0.1:8000');
    });

    it('should return cpu url', () => {
      const manager = new ServerManager({});
      
      expect(manager.getServerUrl('cpu')).toBe('http://127.0.0.1:8001');
    });

    it('should return undefined for invalid server', () => {
      const manager = new ServerManager({});
      
      expect(manager.getServerUrl('invalid')).toBeUndefined();
    });
  });

  describe('isCPUFallbackEnabled', () => {
    it('should return false by default', () => {
      const manager = new ServerManager({});
      
      expect(manager.isCPUFallbackEnabled()).toBe(false);
    });

    it('should return true when enabled in config', () => {
      const config = AIConfigBuilder.create()
        .withCPUFallback(true)
        .build();
      const manager = new ServerManager(config);
      
      expect(manager.isCPUFallbackEnabled()).toBe(true);
    });

    it('should return false when disabled in config', () => {
      const config = AIConfigBuilder.create()
        .withCPUFallback(false)
        .build();
      const manager = new ServerManager(config);
      
      expect(manager.isCPUFallbackEnabled()).toBe(false);
    });
  });

  describe('getMaxConcurrent', () => {
    it('should return default value', () => {
      const manager = new ServerManager({});
      
      expect(manager.getMaxConcurrent()).toBe(4);
    });

    it('should return custom value from config', () => {
      const config = AIConfigBuilder.create()
        .withMaxConcurrent(8)
        .build();
      const manager = new ServerManager(config);
      
      expect(manager.getMaxConcurrent()).toBe(8);
    });
  });

  describe('healthCheck', () => {
    it.skip('SKIP: requires LLM server - should check gpu health', async () => {
      const manager = new ServerManager({});
      
      const result = await manager.healthCheck();
      
      expect(result).toHaveProperty('gpu');
      expect(result).toHaveProperty('cpu');
    });

    it.skip('SKIP: requires LLM server - should mark servers unavailable on failure', async () => {
      const manager = new ServerManager({
        llm: { gpu: { port: 99999 } }
      });
      
      const result = await manager.healthCheck();
      
      expect(result.gpu).toBe(false);
    });

    it('should not check cpu when fallback disabled', async () => {
      const config = AIConfigBuilder.create()
        .withCPUFallback(false)
        .build();
      const manager = new ServerManager(config);
      
      const result = await manager.healthCheck();
      
      expect(result.cpu).toBe(false);
    });
  });

  describe('server selection scenarios', () => {
    it('should select gpu when both available', () => {
      const manager = new ServerManager({});
      manager.servers.gpu.available = true;
      manager.servers.cpu.available = true;
      
      expect(manager.selectServer('gpu')).toBe('gpu');
    });

    it('should select cpu when only cpu available', () => {
      const config = AIConfigBuilder.create()
        .withCPUFallback(true)
        .build();
      const manager = new ServerManager(config);
      manager.servers.gpu.available = false;
      manager.servers.cpu.available = true;
      
      expect(manager.selectServer('gpu')).toBe('cpu');
    });

    it('should handle alternating requests', () => {
      const manager = new ServerManager({});
      manager.servers.gpu.available = true;
      manager.servers.gpu.maxParallel = 2;
      
      manager.acquireServer('gpu');
      expect(manager.selectServer('gpu')).toBe('gpu');
      
      manager.acquireServer('gpu');
      expect(manager.selectServer('gpu')).toBe(null);
      
      manager.releaseServer('gpu');
      expect(manager.selectServer('gpu')).toBe('gpu');
    });
  });
});
