/**
 * @fileoverview index.test.js
 * 
 * Comprehensive tests for the communication extractors index module
 * Tests exports and the detectAllAdvancedConnections orchestrator
 * 
 * @module tests/unit/layer-a-analysis/extractors/communication/index
 */

import { describe, it, expect } from 'vitest';
import {
  detectAllAdvancedConnections,
  extractWebSocket,
  extractNetworkCalls,
  extractWebWorkerCommunication,
  extractSharedWorkerUsage,
  extractBroadcastChannel,
  extractMessageChannel,
  extractServerSentEvents,
  extractWindowPostMessage,
  getWebSocketConnections,
  getWebWorkers,
  getPostMessages,
  getBroadcastChannels,
  getServerSentEvents,
  getMessageChannels
} from '#layer-a/extractors/communication/index.js';
import {
  CommunicationBuilder,
  CommunicationScenarioFactory
} from '../../../../factories/extractor-test.factory.js';

describe('Communication Extractors Index', () => {
  // ============================================
  // Export Contract Tests
  // ============================================
  describe('Export Contract', () => {
    it('should export detectAllAdvancedConnections', () => {
      expect(detectAllAdvancedConnections).toBeDefined();
      expect(typeof detectAllAdvancedConnections).toBe('function');
    });

    it('should export all individual extractors', () => {
      expect(extractWebSocket).toBeDefined();
      expect(extractNetworkCalls).toBeDefined();
      expect(extractWebWorkerCommunication).toBeDefined();
      expect(extractSharedWorkerUsage).toBeDefined();
      expect(extractBroadcastChannel).toBeDefined();
      expect(extractMessageChannel).toBeDefined();
      expect(extractServerSentEvents).toBeDefined();
      expect(extractWindowPostMessage).toBeDefined();
    });

    it('should export all convenience getters', () => {
      expect(getWebSocketConnections).toBeDefined();
      expect(getWebWorkers).toBeDefined();
      expect(getPostMessages).toBeDefined();
      expect(getBroadcastChannels).toBeDefined();
      expect(getServerSentEvents).toBeDefined();
      expect(getMessageChannels).toBeDefined();
    });

    it('all extractors should be functions', () => {
      expect(typeof extractWebSocket).toBe('function');
      expect(typeof extractNetworkCalls).toBe('function');
      expect(typeof extractWebWorkerCommunication).toBe('function');
      expect(typeof extractSharedWorkerUsage).toBe('function');
      expect(typeof extractBroadcastChannel).toBe('function');
      expect(typeof extractMessageChannel).toBe('function');
      expect(typeof extractServerSentEvents).toBe('function');
      expect(typeof extractWindowPostMessage).toBe('function');
    });

    it('all convenience getters should be functions', () => {
      expect(typeof getWebSocketConnections).toBe('function');
      expect(typeof getWebWorkers).toBe('function');
      expect(typeof getPostMessages).toBe('function');
      expect(typeof getBroadcastChannels).toBe('function');
      expect(typeof getServerSentEvents).toBe('function');
      expect(typeof getMessageChannels).toBe('function');
    });
  });

  // ============================================
  // Structure Contract - detectAllAdvancedConnections
  // ============================================
  describe('detectAllAdvancedConnections Structure Contract', () => {
    it('should return object with all communication categories', () => {
      const result = detectAllAdvancedConnections('');
      
      expect(result).toHaveProperty('webWorkers');
      expect(result).toHaveProperty('sharedWorkers');
      expect(result).toHaveProperty('broadcastChannels');
      expect(result).toHaveProperty('messageChannels');
      expect(result).toHaveProperty('webSockets');
      expect(result).toHaveProperty('serverSentEvents');
      expect(result).toHaveProperty('networkCalls');
      expect(result).toHaveProperty('windowPostMessage');
    });

    it('should return object with all getter', () => {
      const result = detectAllAdvancedConnections('');
      expect(result).toHaveProperty('all');
    });

    it('all getter should return array', () => {
      const result = detectAllAdvancedConnections('');
      expect(Array.isArray(result.all)).toBe(true);
    });

    it('should return empty result for empty code', () => {
      const result = detectAllAdvancedConnections('');
      
      expect(result.webWorkers.all).toHaveLength(0);
      expect(result.sharedWorkers.all).toHaveLength(0);
      expect(result.broadcastChannels.all).toHaveLength(0);
      expect(result.messageChannels.all).toHaveLength(0);
      expect(result.webSockets.all).toHaveLength(0);
      expect(result.serverSentEvents.all).toHaveLength(0);
      expect(result.networkCalls.all).toHaveLength(0);
      expect(result.windowPostMessage.all).toHaveLength(0);
      expect(result.all).toHaveLength(0);
    });
  });

  // ============================================
  // detectAllAdvancedConnections Integration Tests
  // ============================================
  describe('detectAllAdvancedConnections Integration', () => {
    it('should detect WebSocket in code', () => {
      const code = "const ws = new WebSocket('wss://example.com');";
      const result = detectAllAdvancedConnections(code);
      
      expect(result.webSockets.urls).toHaveLength(1);
      expect(result.all.length).toBeGreaterThan(0);
    });

    it('should detect Network calls in code', () => {
      const code = "fetch('/api/data');";
      const result = detectAllAdvancedConnections(code);
      
      expect(result.networkCalls.urls).toHaveLength(1);
      expect(result.all.length).toBeGreaterThan(0);
    });

    it('should detect Web Workers in code', () => {
      const code = "const worker = new Worker('./worker.js');";
      const result = detectAllAdvancedConnections(code);
      
      expect(result.webWorkers.outgoing.length).toBeGreaterThan(0);
      expect(result.all.length).toBeGreaterThan(0);
    });

    it('should detect Shared Workers in code', () => {
      const code = "const sw = new SharedWorker('./shared.js');";
      const result = detectAllAdvancedConnections(code);
      
      expect(result.sharedWorkers.workers).toHaveLength(1);
      expect(result.all.length).toBeGreaterThan(0);
    });

    it('should detect BroadcastChannel in code', () => {
      const code = "const bc = new BroadcastChannel('my-channel');";
      const result = detectAllAdvancedConnections(code);
      
      expect(result.broadcastChannels.channels).toHaveLength(1);
      expect(result.all.length).toBeGreaterThan(0);
    });

    it('should detect MessageChannel in code', () => {
      const code = 'const mc = new MessageChannel();';
      const result = detectAllAdvancedConnections(code);
      
      expect(result.messageChannels.channels.length).toBeGreaterThan(0);
      expect(result.all.length).toBeGreaterThan(0);
    });

    it('should detect Server-Sent Events in code', () => {
      const code = "const es = new EventSource('/events');";
      const result = detectAllAdvancedConnections(code);
      
      expect(result.serverSentEvents.urls).toHaveLength(1);
      expect(result.all.length).toBeGreaterThan(0);
    });

    it('should detect Window PostMessage in code', () => {
      const code = "parent.postMessage('hello', '*');";
      const result = detectAllAdvancedConnections(code);
      
      expect(result.windowPostMessage.outgoing).toHaveLength(1);
      expect(result.all.length).toBeGreaterThan(0);
    });

    it('should detect all communication types in complex code', () => {
      const builder = new CommunicationBuilder()
        .withWebSocketSecure('wss://example.com')
        .withFetch('/api/data')
        .withWorker('./worker.js')
        .withSharedWorker('./shared.js')
        .withBroadcastChannel('sync')
        .withMessageChannel()
        .withEventSource('/events')
        .withWindowPostMessage('parent', "'msg'");
      
      const result = detectAllAdvancedConnections(builder.code);
      
      expect(result.webSockets.urls.length).toBeGreaterThan(0);
      expect(result.networkCalls.urls.length).toBeGreaterThan(0);
      expect(result.webWorkers.outgoing.length).toBeGreaterThan(0);
      expect(result.sharedWorkers.workers.length).toBeGreaterThan(0);
      expect(result.broadcastChannels.channels.length).toBeGreaterThan(0);
      expect(result.messageChannels.channels.length).toBeGreaterThan(0);
      expect(result.serverSentEvents.urls.length).toBeGreaterThan(0);
      expect(result.windowPostMessage.outgoing.length).toBeGreaterThan(0);
      
      expect(result.all.length).toBeGreaterThan(5);
    });
  });

  // ============================================
  // all Getter Tests
  // ============================================
  describe('all Getter', () => {
    it('should combine all communication types', () => {
      const code = `
        const ws = new WebSocket('wss://ws.example.com');
        fetch('/api/data');
        const worker = new Worker('./worker.js');
      `;
      const result = detectAllAdvancedConnections(code);
      
      const totalItems = 
        result.webSockets.all.length +
        result.sharedWorkers.all.length +
        result.broadcastChannels.all.length +
        result.messageChannels.all.length +
        result.serverSentEvents.all.length +
        result.networkCalls.all.length +
        result.windowPostMessage.all.length +
        result.webWorkers.all.length;
      
      expect(result.all.length).toBe(totalItems);
    });

    it('should be iterable', () => {
      const code = "fetch('/api/test');";
      const result = detectAllAdvancedConnections(code);
      
      let count = 0;
      for (const item of result.all) {
        count++;
      }
      expect(count).toBe(result.all.length);
    });

    it('should contain items from multiple sources', () => {
      const code = `
        fetch('/api/1');
        fetch('/api/2');
        const ws = new WebSocket('wss://ws.example.com');
      `;
      const result = detectAllAdvancedConnections(code);
      
      expect(result.all.length).toBe(3);
    });
  });

  // ============================================
  // Convenience Getters Tests
  // ============================================
  describe('Convenience Getters', () => {
    describe('getWebSocketConnections', () => {
      it('should return connections array', () => {
        const code = "new WebSocket('wss://example.com');";
        const result = getWebSocketConnections(code);
        
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
      });

      it('should return empty array when no WebSockets', () => {
        const code = 'const x = 1;';
        const result = getWebSocketConnections(code);
        
        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(0);
      });

      it('should return connections from result', () => {
        const code = `
          new WebSocket('wss://ws1.com');
          new WebSocket('wss://ws2.com');
        `;
        const result = getWebSocketConnections(code);
        
        expect(result.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe('getWebWorkers', () => {
      it('should return workers array', () => {
        const code = "new Worker('./worker.js');";
        const result = getWebWorkers(code);
        
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
      });

      it('should return empty array when no workers', () => {
        const code = 'const x = 1;';
        const result = getWebWorkers(code);
        
        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(0);
      });
    });

    describe('getPostMessages', () => {
      it('should return messages array', () => {
        const code = "parent.postMessage('hello', '*');";
        const result = getPostMessages(code);
        
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
      });

      it('should return empty array when no postMessages', () => {
        const code = 'const x = 1;';
        const result = getPostMessages(code);
        
        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(0);
      });
    });

    describe('getBroadcastChannels', () => {
      it('should return channels array', () => {
        const code = "new BroadcastChannel('test');";
        const result = getBroadcastChannels(code);
        
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
      });

      it('should return empty array when no broadcast channels', () => {
        const code = 'const x = 1;';
        const result = getBroadcastChannels(code);
        
        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(0);
      });
    });

    describe('getServerSentEvents', () => {
      it('should return events array', () => {
        const code = "new EventSource('/events');";
        const result = getServerSentEvents(code);
        
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
      });

      it('should return empty array when no SSE', () => {
        const code = 'const x = 1;';
        const result = getServerSentEvents(code);
        
        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(0);
      });
    });

    describe('getMessageChannels', () => {
      it('should return channels array', () => {
        const code = 'new MessageChannel();';
        const result = getMessageChannels(code);
        
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
      });

      it('should return empty array when no message channels', () => {
        const code = 'const x = 1;';
        const result = getMessageChannels(code);
        
        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(0);
      });
    });
  });

  // ============================================
  // Error Handling Contract
  // ============================================
  describe('Error Handling Contract', () => {
    it('detectAllAdvancedConnections should not throw on empty string', () => {
      expect(() => detectAllAdvancedConnections('')).not.toThrow();
    });

    it('detectAllAdvancedConnections should not throw on invalid code', () => {
      expect(() => detectAllAdvancedConnections('invalid {{{')).not.toThrow();
    });

    it('convenience getters should not throw on empty string', () => {
      expect(() => getWebSocketConnections('')).not.toThrow();
      expect(() => getWebWorkers('')).not.toThrow();
      expect(() => getPostMessages('')).not.toThrow();
      expect(() => getBroadcastChannels('')).not.toThrow();
      expect(() => getServerSentEvents('')).not.toThrow();
      expect(() => getMessageChannels('')).not.toThrow();
    });

    it('convenience getters should return arrays on invalid code', () => {
      const invalidCode = 'broken {{{';
      
      expect(Array.isArray(getWebSocketConnections(invalidCode))).toBe(true);
      expect(Array.isArray(getWebWorkers(invalidCode))).toBe(true);
      expect(Array.isArray(getPostMessages(invalidCode))).toBe(true);
      expect(Array.isArray(getBroadcastChannels(invalidCode))).toBe(true);
      expect(Array.isArray(getServerSentEvents(invalidCode))).toBe(true);
      expect(Array.isArray(getMessageChannels(invalidCode))).toBe(true);
    });

    it('should handle very long code', () => {
      let code = '';
      for (let i = 0; i < 1000; i++) {
        code += `// Line ${i}\n`;
      }
      code += "fetch('/api/test');";
      
      const result = detectAllAdvancedConnections(code);
      expect(result.networkCalls.urls).toHaveLength(1);
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('Edge Cases', () => {
    it('should handle code with only whitespace', () => {
      const result = detectAllAdvancedConnections('   \n\t  \n  ');
      expect(result.all).toHaveLength(0);
    });

    it('should handle code with only comments', () => {
      const result = detectAllAdvancedConnections('// Just a comment\n/* Another comment */');
      expect(result.all).toHaveLength(0);
    });

    it('should handle null/undefined gracefully', () => {
      expect(() => detectAllAdvancedConnections(String(null))).not.toThrow();
      expect(() => detectAllAdvancedConnections(String(undefined))).not.toThrow();
    });

    it('should handle code with all communication types', () => {
      const scenario = CommunicationScenarioFactory.complexCommunication();
      const result = detectAllAdvancedConnections(scenario.code);
      
      expect(result.all.length).toBeGreaterThan(2);
    });

    it('should isolate results between calls', () => {
      const result1 = detectAllAdvancedConnections("fetch('/api/1');");
      const result2 = detectAllAdvancedConnections("fetch('/api/2');");
      
      // Results should not affect each other
      expect(result1.networkCalls.urls[0].url).toBe('/api/1');
      expect(result2.networkCalls.urls[0].url).toBe('/api/2');
    });

    it('should preserve item structure in all array', () => {
      const code = "fetch('/api/test');";
      const result = detectAllAdvancedConnections(code);
      
      if (result.all.length > 0) {
        const item = result.all[0];
        expect(item).toHaveProperty('url');
        expect(item).toHaveProperty('line');
        expect(item).toHaveProperty('type');
      }
    });
  });
});
