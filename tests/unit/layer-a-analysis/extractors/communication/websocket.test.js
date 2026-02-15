/**
 * @fileoverview websocket.test.js
 * 
 * Comprehensive tests for WebSocket communication extractor
 * Tests WebSocket URL extraction and event detection
 * 
 * @module tests/unit/layer-a-analysis/extractors/communication/websocket
 */

import { describe, it, expect } from 'vitest';
import { extractWebSocket } from '#layer-a/extractors/communication/websocket.js';
import {
  CommunicationBuilder,
  CommunicationScenarioFactory,
  CommunicationExtractorContracts,
  CommunicationConstants
} from '../../../../factories/extractor-test.factory.js';

describe('WebSocket Extractor', () => {
  // ============================================
  // Structure Contract Tests
  // ============================================
  describe('Structure Contract', () => {
    it('should return object with required fields', () => {
      const result = extractWebSocket('');
      
      CommunicationExtractorContracts.REQUIRED_WEBSOCKET_FIELDS.forEach(field => {
        expect(result).toHaveProperty(field);
      });
    });

    it('should have urls as array', () => {
      const result = extractWebSocket('');
      expect(Array.isArray(result.urls)).toBe(true);
    });

    it('should have events as array', () => {
      const result = extractWebSocket('');
      expect(Array.isArray(result.events)).toBe(true);
    });

    it('should have all as array', () => {
      const result = extractWebSocket('');
      expect(Array.isArray(result.all)).toBe(true);
    });

    it('should combine urls and events in all array', () => {
      const scenario = CommunicationScenarioFactory.webSocketConnection();
      const result = extractWebSocket(scenario.code);
      
      expect(result.all.length).toBe(result.urls.length + result.events.length);
    });

    it('should return empty arrays for empty code', () => {
      const result = extractWebSocket('');
      expect(result.urls).toHaveLength(0);
      expect(result.events).toHaveLength(0);
      expect(result.all).toHaveLength(0);
    });

    it('should return empty arrays for code without WebSocket', () => {
      const scenario = CommunicationScenarioFactory.codeWithoutCommunication();
      const result = extractWebSocket(scenario.code);
      expect(result.urls).toHaveLength(0);
      expect(result.events).toHaveLength(0);
    });
  });

  // ============================================
  // WebSocket URL Extraction Tests
  // ============================================
  describe('WebSocket URL Extraction', () => {
    it('should extract ws:// URL', () => {
      const scenario = CommunicationScenarioFactory.webSocketMinimal('ws://localhost:8080');
      const result = extractWebSocket(scenario.code);
      
      expect(result.urls).toHaveLength(1);
      expect(result.urls[0].url).toBe('ws://localhost:8080');
    });

    it('should extract wss:// URL', () => {
      const scenario = CommunicationScenarioFactory.webSocketMinimal('wss://secure.example.com');
      const result = extractWebSocket(scenario.code);
      
      expect(result.urls).toHaveLength(1);
      expect(result.urls[0].url).toBe('wss://secure.example.com');
    });

    it('should extract multiple WebSocket URLs', () => {
      const builder = new CommunicationBuilder()
        .withWebSocketSecure('wss://ws1.example.com')
        .withWebSocketSecure('wss://ws2.example.com');
      const result = extractWebSocket(builder.code);
      
      expect(result.urls).toHaveLength(2);
    });

    it('should have correct type for URL items', () => {
      const scenario = CommunicationScenarioFactory.webSocketMinimal();
      const result = extractWebSocket(scenario.code);
      
      expect(result.urls[0].type).toBe(CommunicationConstants.COMMUNICATION_TYPES.WEBSOCKET);
    });

    it('should extract URL with path', () => {
      const builder = new CommunicationBuilder()
        .withWebSocketSecure('wss://api.example.com/v1/stream');
      const result = extractWebSocket(builder.code);
      
      expect(result.urls[0].url).toBe('wss://api.example.com/v1/stream');
    });

    it('should extract URL with query parameters', () => {
      const builder = new CommunicationBuilder()
        .withWebSocketSecure('wss://ws.example.com/socket?token=abc123');
      const result = extractWebSocket(builder.code);
      
      expect(result.urls[0].url).toBe('wss://ws.example.com/socket?token=abc123');
    });
  });

  // ============================================
  // WebSocket Event Detection Tests
  // ============================================
  describe('WebSocket Event Detection', () => {
    it('should detect onopen event', () => {
      const builder = new CommunicationBuilder()
        .withWebSocketFull('wss://example.com', { onopen: 'handleOpen' });
      const result = extractWebSocket(builder.code);
      
      const openEvent = result.events.find(e => e.event === 'onopen');
      expect(openEvent).toBeDefined();
    });

    it('should detect onmessage event', () => {
      const builder = new CommunicationBuilder()
        .withWebSocketFull('wss://example.com', { onmessage: 'handleMessage' });
      const result = extractWebSocket(builder.code);
      
      const messageEvent = result.events.find(e => e.event === 'onmessage');
      expect(messageEvent).toBeDefined();
    });

    it('should detect onclose event', () => {
      const builder = new CommunicationBuilder()
        .withWebSocketFull('wss://example.com', { onclose: 'handleClose' });
      const result = extractWebSocket(builder.code);
      
      const closeEvent = result.events.find(e => e.event === 'onclose');
      expect(closeEvent).toBeDefined();
    });

    it('should detect onerror event', () => {
      const builder = new CommunicationBuilder()
        .withWebSocketFull('wss://example.com', { onerror: 'handleError' });
      const result = extractWebSocket(builder.code);
      
      const errorEvent = result.events.find(e => e.event === 'onerror');
      expect(errorEvent).toBeDefined();
    });

    it('should detect all WebSocket events', () => {
      const scenario = CommunicationScenarioFactory.webSocketConnection();
      const result = extractWebSocket(scenario.code);
      
      CommunicationConstants.WEBSOCKET_EVENTS.forEach(eventName => {
        const found = result.events.find(e => e.event === eventName);
        expect(found).toBeDefined();
      });
    });

    it('should have correct type for event items', () => {
      const builder = new CommunicationBuilder()
        .withWebSocketFull('wss://example.com', { onopen: 'handler' });
      const result = extractWebSocket(builder.code);
      
      expect(result.events[0].type).toBe(CommunicationConstants.COMMUNICATION_TYPES.WEBSOCKET_EVENT);
    });
  });

  // ============================================
  // Line Number Tests
  // ============================================
  describe('Line Number Accuracy', () => {
    it('should report correct line for URL', () => {
      const code = `// Comment
const ws = new WebSocket('wss://example.com');`;
      const result = extractWebSocket(code);
      
      expect(result.urls[0].line).toBe(2);
    });

    it('should report correct line for events', () => {
      const code = `// Line 1
// Line 2
const ws = new WebSocket('wss://example.com');
ws.onopen = handler;`;
      const result = extractWebSocket(code);
      
      expect(result.events[0].line).toBeGreaterThanOrEqual(4);
    });

    it('should have unique line numbers for each item', () => {
      const scenario = CommunicationScenarioFactory.webSocketConnection();
      const result = extractWebSocket(scenario.code);
      const lines = result.all.map(item => item.line);
      const uniqueLines = [...new Set(lines)];
      
      expect(lines.length).toBe(uniqueLines.length);
    });
  });

  // ============================================
  // Error Handling Contract
  // ============================================
  describe('Error Handling Contract', () => {
    it('should not throw on empty string', () => {
      expect(() => extractWebSocket('')).not.toThrow();
    });

    it('should not throw on null (converted to string)', () => {
      expect(() => extractWebSocket(String(null))).not.toThrow();
    });

    it('should not throw on undefined (converted to string)', () => {
      expect(() => extractWebSocket(String(undefined))).not.toThrow();
    });

    it('should not throw on invalid JavaScript', () => {
      const invalidCode = 'function { broken new WebSocket(';
      expect(() => extractWebSocket(invalidCode)).not.toThrow();
    });

    it('should return empty result for invalid code', () => {
      const invalidCode = '{{{ broken syntax';
      const result = extractWebSocket(invalidCode);
      expect(result.all).toHaveLength(0);
    });

    it('should handle malformed WebSocket constructor', () => {
      const code = 'new WebSocket();';
      const result = extractWebSocket(code);
      // Pattern requires URL string, so no match expected
      expect(result.urls).toHaveLength(0);
    });

    it('should handle WebSocket with variable URL', () => {
      const code = 'const url = getUrl(); const ws = new WebSocket(url);';
      const result = extractWebSocket(code);
      // Pattern only matches string literals
      expect(result.urls).toHaveLength(0);
    });

    it('should handle very long code', () => {
      let code = '';
      for (let i = 0; i < 1000; i++) {
        code += `// Line ${i}\n`;
      }
      code += "new WebSocket('wss://example.com');";
      
      const result = extractWebSocket(code);
      expect(result.urls).toHaveLength(1);
      expect(result.urls[0].line).toBe(1001);
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('Edge Cases', () => {
    it('should handle WebSocket with template literal (not captured)', () => {
      const code = 'new WebSocket(`wss://example.com/${id}`);';
      const result = extractWebSocket(code);
      // Pattern only matches single/double quotes
      expect(result.urls).toHaveLength(0);
    });

    it('should handle commented WebSocket code', () => {
      // Note: Regex-based extractor may match commented patterns
      const code = `
        // new WebSocket('wss://ignored.com');
        new WebSocket('wss://real.com');
      `;
      const result = extractWebSocket(code);
      // The real URL should be among the results
      const realUrls = result.urls.filter(u => u.url === 'wss://real.com');
      expect(realUrls.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle multiple WebSocket instances', () => {
      const code = `
        const ws1 = new WebSocket('wss://ws1.com');
        const ws2 = new WebSocket('wss://ws2.com');
        ws1.onopen = handler1;
        ws2.onopen = handler2;
      `;
      const result = extractWebSocket(code);
      expect(result.urls).toHaveLength(2);
      expect(result.events).toHaveLength(2);
    });

    it('should handle WebSocket in string (not actual code)', () => {
      const code = `
        const docs = "Use new WebSocket('wss://fake.com') for connections";
        const real = new WebSocket('wss://real.com');
      `;
      const result = extractWebSocket(code);
      // Both are detected because regex doesn't differentiate
      expect(result.urls.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle event assignment with different patterns', () => {
      const code = `
        ws.onopen = function() {};
        ws.onmessage = (e) => {};
        ws.onclose = handleClose;
      `;
      const result = extractWebSocket(code);
      expect(result.events).toHaveLength(3);
    });
  });
});
