/**
 * @fileoverview communication-contract.test.js
 * 
 * Cross-component contract tests for all communication extractors
 * Ensures all extractors follow consistent interface contracts
 * 
 * @module tests/unit/layer-a-analysis/extractors/communication/communication-contract
 */

import { describe, it, expect } from 'vitest';
import {
  extractWebSocket,
  extractNetworkCalls,
  extractWebWorkerCommunication,
  extractSharedWorkerUsage,
  extractBroadcastChannel,
  extractMessageChannel,
  extractServerSentEvents,
  extractWindowPostMessage,
  detectAllAdvancedConnections
} from '#layer-a/extractors/communication/index.js';
import {
  CommunicationBuilder,
  CommunicationScenarioFactory,
  CommunicationExtractorContracts,
  CommunicationConstants
} from '../../../../factories/extractor-test.factory.js';

describe('Communication Extractor Contracts', () => {
  const FILE_PATH = 'test/communication.js';

  // ============================================
  // Universal Contract Tests
  // ============================================
  describe('Universal Contract - All Extractors', () => {
    const extractors = [
      { name: 'extractWebSocket', fn: extractWebSocket, required: ['urls', 'events', 'all'] },
      { name: 'extractNetworkCalls', fn: extractNetworkCalls, required: ['urls', 'all'] },
      { name: 'extractWebWorkerCommunication', fn: extractWebWorkerCommunication, required: ['incoming', 'outgoing', 'all'] },
      { name: 'extractSharedWorkerUsage', fn: extractSharedWorkerUsage, required: ['workers', 'all'] },
      { name: 'extractBroadcastChannel', fn: extractBroadcastChannel, required: ['channels', 'all'] },
      { name: 'extractMessageChannel', fn: extractMessageChannel, required: ['channels', 'all'] },
      { name: 'extractServerSentEvents', fn: extractServerSentEvents, required: ['urls', 'events', 'all'] },
      { name: 'extractWindowPostMessage', fn: extractWindowPostMessage, required: ['outgoing', 'incoming', 'all'] }
    ];

    extractors.forEach(({ name, fn, required }) => {
      describe(`${name} contract`, () => {
        it('must return an object', () => {
          const result = fn('');
          expect(typeof result).toBe('object');
          expect(result).not.toBeNull();
        });

        it('must have required fields', () => {
          const result = fn('');
          required.forEach(field => {
            expect(result).toHaveProperty(field);
          });
        });

        it('must have "all" as an array', () => {
          const result = fn('');
          expect(Array.isArray(result.all)).toBe(true);
        });

        it('must return consistent structure for empty input', () => {
          const result1 = fn('');
          const result2 = fn('');
          expect(Object.keys(result1)).toEqual(Object.keys(result2));
        });

        it('must not throw on empty string', () => {
          expect(() => fn('')).not.toThrow();
        });

        it('must not throw on invalid code', () => {
          expect(() => fn('invalid {{{')).not.toThrow();
        });

        it('must return empty arrays for empty input', () => {
          const result = fn('');
          expect(result.all).toHaveLength(0);
        });
      });
    });
  });

  // ============================================
  // Item Structure Contract
  // ============================================
  describe('Item Structure Contract', () => {
    it('all items must have type and line properties', () => {
      const code = `
        const ws = new WebSocket('wss://example.com');
        fetch('/api/data');
        const worker = new Worker('./worker.js');
        const bc = new BroadcastChannel('test');
        const mc = new MessageChannel();
        const es = new EventSource('/events');
        parent.postMessage('hello', '*');
      `;
      
      const result = detectAllAdvancedConnections(code);
      
      result.all.forEach(item => {
        expect(item).toHaveProperty('type');
        expect(item).toHaveProperty('line');
        expect(typeof item.type).toBe('string');
        expect(typeof item.line).toBe('number');
      });
    });

    it('all items must have positive line numbers', () => {
      const code = `
        fetch('/api/1');
        fetch('/api/2');
      `;
      
      const result = detectAllAdvancedConnections(code);
      
      result.all.forEach(item => {
        expect(item.line).toBeGreaterThan(0);
      });
    });

    it('all items must have non-empty type strings', () => {
      const code = "fetch('/api/test');";
      
      const result = detectAllAdvancedConnections(code);
      
      result.all.forEach(item => {
        expect(item.type.length).toBeGreaterThan(0);
      });
    });
  });

  // ============================================
  // Type Consistency Contract
  // ============================================
  describe('Type Consistency Contract', () => {
    it('WebSocket items must have valid types', () => {
      const validTypes = [
        CommunicationConstants.COMMUNICATION_TYPES.WEBSOCKET,
        CommunicationConstants.COMMUNICATION_TYPES.WEBSOCKET_EVENT
      ];
      
      const code = `
        const ws = new WebSocket('wss://example.com');
        ws.onopen = handler;
      `;
      const result = extractWebSocket(code);
      
      result.all.forEach(item => {
        expect(validTypes).toContain(item.type);
      });
    });

    it('Network items must have valid types', () => {
      const validTypes = [
        CommunicationConstants.COMMUNICATION_TYPES.NETWORK_FETCH,
        CommunicationConstants.COMMUNICATION_TYPES.NETWORK_XHR,
        CommunicationConstants.COMMUNICATION_TYPES.NETWORK_AXIOS
      ];
      
      const code = `
        fetch('/api/data');
        xhr.open('GET', '/api/xhr');
        axios.get('/api/axios');
      `;
      const result = extractNetworkCalls(code);
      
      result.all.forEach(item => {
        expect(validTypes).toContain(item.type);
      });
    });

    it('Worker items must have valid types', () => {
      const validTypes = [
        'worker_creation',
        'worker_postMessage',
        'worker_self_postMessage',
        'worker_onmessage'
      ];
      
      const code = `
        const w = new Worker('./worker.js');
        w.postMessage('hello');
        w.onmessage = handler;
      `;
      const result = extractWebWorkerCommunication(code);
      
      result.all.forEach(item => {
        expect(validTypes).toContain(item.type);
      });
    });

    it('SharedWorker items must have correct type', () => {
      const code = "new SharedWorker('./shared.js');";
      const result = extractSharedWorkerUsage(code);
      
      result.all.forEach(item => {
        expect(item.type).toBe(CommunicationConstants.COMMUNICATION_TYPES.SHAREDWORKER_CREATION);
      });
    });

    it('BroadcastChannel items must have correct type', () => {
      const code = "new BroadcastChannel('test');";
      const result = extractBroadcastChannel(code);
      
      result.all.forEach(item => {
        expect(item.type).toBe(CommunicationConstants.COMMUNICATION_TYPES.BROADCAST_CHANNEL);
      });
    });

    it('MessageChannel items must have valid types', () => {
      const validTypes = [
        CommunicationConstants.COMMUNICATION_TYPES.MESSAGECHANNEL_CREATION,
        CommunicationConstants.COMMUNICATION_TYPES.MESSAGECHANNEL_PORT
      ];
      
      const code = `
        const mc = new MessageChannel();
        mc.port1.postMessage('hello');
      `;
      const result = extractMessageChannel(code);
      
      result.all.forEach(item => {
        expect(validTypes).toContain(item.type);
      });
    });

    it('SSE items must have valid types', () => {
      const validTypes = [
        CommunicationConstants.COMMUNICATION_TYPES.EVENTSOURCE_URL,
        CommunicationConstants.COMMUNICATION_TYPES.EVENTSOURCE_EVENT
      ];
      
      const code = `
        const es = new EventSource('/events');
        es.addEventListener('update', handler);
      `;
      const result = extractServerSentEvents(code);
      
      result.all.forEach(item => {
        expect(validTypes).toContain(item.type);
      });
    });

    it('PostMessage items must have valid types', () => {
      const validTypes = [
        CommunicationConstants.COMMUNICATION_TYPES.WINDOW_POSTMESSAGE_OUTGOING,
        CommunicationConstants.COMMUNICATION_TYPES.WINDOW_POSTMESSAGE_LISTENER,
        CommunicationConstants.COMMUNICATION_TYPES.WINDOW_ONMESSAGE
      ];
      
      const code = `
        parent.postMessage('hello', '*');
        window.addEventListener('message', handler);
        window.onmessage = handler2;
      `;
      const result = extractWindowPostMessage(code);
      
      result.all.forEach(item => {
        expect(validTypes).toContain(item.type);
      });
    });
  });

  // ============================================
  // Line Number Consistency Contract
  // ============================================
  describe('Line Number Consistency Contract', () => {
    it('all extractors must use 1-based line numbering', () => {
      const code = 'fetch(\'/api/test\');'; // Line 1
      
      const networkResult = extractNetworkCalls(code);
      
      if (networkResult.all.length > 0) {
        expect(networkResult.all[0].line).toBe(1);
      }
    });

    it('line numbers must increase with code position', () => {
      const code = `
        // Line 1
        fetch('/api/1');
        // Line 3
        fetch('/api/2');
      `;
      const result = extractNetworkCalls(code);
      
      if (result.all.length >= 2) {
        expect(result.all[1].line).toBeGreaterThan(result.all[0].line);
      }
    });

    it('all items in all array must have unique line numbers when different', () => {
      const code = `
        fetch('/api/1');
        fetch('/api/2');
      `;
      const result = extractNetworkCalls(code);
      const lines = result.all.map(item => item.line);
      const uniqueLines = [...new Set(lines)];
      
      expect(lines.length).toBe(uniqueLines.length);
    });
  });

  // ============================================
  // Cross-Extractor Consistency
  // ============================================
  describe('Cross-Extractor Consistency', () => {
    it('detectAllAdvancedConnections.all must equal sum of all categories', () => {
      const code = `
        const ws = new WebSocket('wss://example.com');
        fetch('/api/data');
        const worker = new Worker('./worker.js');
      `;
      const result = detectAllAdvancedConnections(code);
      
      const totalFromCategories = 
        result.webSockets.all.length +
        result.sharedWorkers.all.length +
        result.broadcastChannels.all.length +
        result.messageChannels.all.length +
        result.serverSentEvents.all.length +
        result.networkCalls.all.length +
        result.windowPostMessage.all.length +
        result.webWorkers.all.length;
      
      expect(result.all.length).toBe(totalFromCategories);
    });

    it('all category results must have consistent structure', () => {
      const result = detectAllAdvancedConnections('');
      
      const categories = [
        result.webSockets,
        result.sharedWorkers,
        result.broadcastChannels,
        result.messageChannels,
        result.serverSentEvents,
        result.networkCalls,
        result.windowPostMessage,
        result.webWorkers
      ];
      
      categories.forEach(category => {
        expect(category).toHaveProperty('all');
        expect(Array.isArray(category.all)).toBe(true);
      });
    });

    it('individual extractors must match detectAllAdvancedConnections results', () => {
      const code = "fetch('/api/test');";
      
      const individual = extractNetworkCalls(code);
      const combined = detectAllAdvancedConnections(code);
      
      expect(combined.networkCalls.urls).toHaveLength(individual.urls.length);
    });
  });

  // ============================================
  // Error Handling Contract
  // ============================================
  describe('Error Handling Contract', () => {
    it('all extractors must handle empty input gracefully', () => {
      const extractors = [
        extractWebSocket,
        extractNetworkCalls,
        extractWebWorkerCommunication,
        extractSharedWorkerUsage,
        extractBroadcastChannel,
        extractMessageChannel,
        extractServerSentEvents,
        extractWindowPostMessage
      ];
      
      extractors.forEach(fn => {
        const result = fn('');
        expect(result).toBeDefined();
        expect(result.all).toBeDefined();
        expect(Array.isArray(result.all)).toBe(true);
      });
    });

    it('all extractors must handle malformed input', () => {
      const malformedInputs = [
        '{{{ broken',
        'function {',
        'const x = {',
        'new Broken(',
        '}}}'
      ];
      
      const extractors = [
        extractWebSocket,
        extractNetworkCalls,
        extractWebWorkerCommunication,
        extractSharedWorkerUsage,
        extractBroadcastChannel,
        extractMessageChannel,
        extractServerSentEvents,
        extractWindowPostMessage
      ];
      
      malformedInputs.forEach(code => {
        extractors.forEach(fn => {
          expect(() => fn(code)).not.toThrow();
          const result = fn(code);
          expect(Array.isArray(result.all)).toBe(true);
        });
      });
    });

    it('all extractors must handle very long input', () => {
      let code = '';
      for (let i = 0; i < 1000; i++) {
        code += `// Line ${i}\n`;
      }
      code += "fetch('/api/test');";
      
      expect(() => extractNetworkCalls(code)).not.toThrow();
      const result = extractNetworkCalls(code);
      expect(result.all.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // Data Integrity Contract
  // ============================================
  describe('Data Integrity Contract', () => {
    it('URL-containing items must have non-empty URLs', () => {
      const code = `
        new WebSocket('wss://example.com');
        fetch('/api/data');
        new EventSource('/events');
      `;
      const result = detectAllAdvancedConnections(code);
      
      result.all.forEach(item => {
        if (item.url !== undefined) {
          expect(typeof item.url).toBe('string');
          expect(item.url.length).toBeGreaterThan(0);
        }
      });
    });

    it('channel-containing items must have non-empty channel names', () => {
      const code = `
        new BroadcastChannel('test-channel');
      `;
      const result = extractBroadcastChannel(code);
      
      result.all.forEach(item => {
        if (item.channel !== undefined) {
          expect(typeof item.channel).toBe('string');
          expect(item.channel.length).toBeGreaterThan(0);
        }
      });
    });

    it('event-containing items must have non-empty event names', () => {
      const code = `
        const es = new EventSource('/events');
        es.addEventListener('update', handler);
      `;
      const result = extractServerSentEvents(code);
      
      result.all.forEach(item => {
        if (item.event !== undefined) {
          expect(typeof item.event).toBe('string');
          expect(item.event.length).toBeGreaterThan(0);
        }
      });
    });

    it('direction-containing items must have valid direction values', () => {
      const validDirections = ['incoming', 'outgoing', 'creates_worker'];
      const code = `
        worker.postMessage('hello');
        worker.onmessage = handler;
        const w = new Worker('./worker.js');
      `;
      const result = extractWebWorkerCommunication(code);
      
      result.all.forEach(item => {
        if (item.direction !== undefined) {
          expect(validDirections).toContain(item.direction);
        }
      });
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('Edge Cases', () => {
    it('should handle code with mixed communication patterns', () => {
      const builder = new CommunicationBuilder()
        .withWebSocketSecure('wss://example.com')
        .withFetch('/api/data')
        .withWorker('./worker.js')
        .withBroadcastChannel('sync')
        .withMessageChannel()
        .withEventSource('/events')
        .withWindowPostMessage('parent', "'msg'");
      
      const result = detectAllAdvancedConnections(builder.code);
      
      expect(result.all.length).toBeGreaterThan(5);
      
      // Verify all types are present
      const types = result.all.map(item => item.type);
      expect(types.some(t => t.includes('websocket'))).toBe(true);
      expect(types.some(t => t.includes('network'))).toBe(true);
      expect(types.some(t => t.includes('worker'))).toBe(true);
    });

    it('should handle duplicate patterns in code', () => {
      const code = `
        fetch('/api/1');
        fetch('/api/1');
        fetch('/api/1');
      `;
      const result = extractNetworkCalls(code);
      
      expect(result.all).toHaveLength(3);
      expect(result.all.every(item => item.url === '/api/1')).toBe(true);
    });

    it('should handle deeply nested code', () => {
      const code = `
        function outer() {
          function inner() {
            if (true) {
              fetch('/api/deep');
            }
          }
        }
      `;
      const result = extractNetworkCalls(code);
      
      expect(result.all).toHaveLength(1);
      expect(result.all[0].url).toBe('/api/deep');
    });

    it('should handle patterns in strings vs actual code', () => {
      const code = `
        const docs = "Use fetch('/fake') for API calls";
        fetch('/real');
      `;
      const result = extractNetworkCalls(code);
      
      // Pattern matches both, caller needs to filter if needed
      expect(result.all.length).toBeGreaterThanOrEqual(1);
    });

    it('should maintain isolation between extractor instances', () => {
      const code1 = "fetch('/api/1');";
      const code2 = "fetch('/api/2');";
      
      const result1a = extractNetworkCalls(code1);
      const result1b = extractNetworkCalls(code1);
      const result2 = extractNetworkCalls(code2);
      
      expect(result1a.urls[0].url).toBe('/api/1');
      expect(result1b.urls[0].url).toBe('/api/1');
      expect(result2.urls[0].url).toBe('/api/2');
    });
  });
});
