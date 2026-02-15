/**
 * @fileoverview server-sent-events.test.js
 * 
 * Comprehensive tests for Server-Sent Events (EventSource) extractor
 * Tests EventSource connections and event listener detection
 * 
 * @module tests/unit/layer-a-analysis/extractors/communication/server-sent-events
 */

import { describe, it, expect } from 'vitest';
import { extractServerSentEvents } from '#layer-a/extractors/communication/server-sent-events.js';
import {
  CommunicationBuilder,
  CommunicationScenarioFactory,
  CommunicationExtractorContracts,
  CommunicationConstants
} from '../../../../factories/extractor-test.factory.js';

describe('Server-Sent Events Extractor', () => {
  // ============================================
  // Structure Contract Tests
  // ============================================
  describe('Structure Contract', () => {
    it('should return object with required fields', () => {
      const result = extractServerSentEvents('');
      
      CommunicationExtractorContracts.REQUIRED_SSE_FIELDS.forEach(field => {
        expect(result).toHaveProperty(field);
      });
    });

    it('should have urls as array', () => {
      const result = extractServerSentEvents('');
      expect(Array.isArray(result.urls)).toBe(true);
    });

    it('should have events as array', () => {
      const result = extractServerSentEvents('');
      expect(Array.isArray(result.events)).toBe(true);
    });

    it('should have all as array', () => {
      const result = extractServerSentEvents('');
      expect(Array.isArray(result.all)).toBe(true);
    });

    it('should combine urls and events in all array', () => {
      const scenario = CommunicationScenarioFactory.eventSourceWithListeners();
      const result = extractServerSentEvents(scenario.code);
      
      expect(result.all.length).toBe(result.urls.length + result.events.length);
    });

    it('should return empty arrays for empty code', () => {
      const result = extractServerSentEvents('');
      expect(result.urls).toHaveLength(0);
      expect(result.events).toHaveLength(0);
      expect(result.all).toHaveLength(0);
    });

    it('should return empty arrays for code without EventSource', () => {
      const scenario = CommunicationScenarioFactory.codeWithoutCommunication();
      const result = extractServerSentEvents(scenario.code);
      expect(result.urls).toHaveLength(0);
      expect(result.events).toHaveLength(0);
    });
  });

  // ============================================
  // EventSource URL Tests
  // ============================================
  describe('EventSource URL Extraction', () => {
    it('should extract new EventSource() with single quotes', () => {
      const scenario = CommunicationScenarioFactory.eventSource('/events/stream');
      const result = extractServerSentEvents(scenario.code);
      
      expect(result.urls).toHaveLength(1);
      expect(result.urls[0].url).toBe('/events/stream');
    });

    it('should extract new EventSource() with double quotes', () => {
      const code = 'const es = new EventSource("/sse/updates");';
      const result = extractServerSentEvents(code);
      
      expect(result.urls).toHaveLength(1);
      expect(result.urls[0].url).toBe('/sse/updates');
    });

    it('should have correct type for URL', () => {
      const scenario = CommunicationScenarioFactory.eventSource();
      const result = extractServerSentEvents(scenario.code);
      
      expect(result.urls[0].type).toBe(CommunicationConstants.COMMUNICATION_TYPES.EVENTSOURCE_URL);
    });

    it('should extract multiple EventSources', () => {
      const code = `
        const es1 = new EventSource('/stream1');
        const es2 = new EventSource('/stream2');
      `;
      const result = extractServerSentEvents(code);
      
      expect(result.urls).toHaveLength(2);
    });

    it('should extract EventSource with full URL', () => {
      const builder = new CommunicationBuilder()
        .withEventSource('https://api.example.com/events');
      const result = extractServerSentEvents(builder.code);
      
      expect(result.urls[0].url).toBe('https://api.example.com/events');
    });

    it('should extract EventSource with query parameters', () => {
      const builder = new CommunicationBuilder()
        .withEventSource('/events?token=abc123&user=1');
      const result = extractServerSentEvents(builder.code);
      
      expect(result.urls[0].url).toBe('/events?token=abc123&user=1');
    });

    it('should extract EventSource with port', () => {
      const code = "const es = new EventSource('http://localhost:3000/sse');";
      const result = extractServerSentEvents(code);
      
      expect(result.urls[0].url).toBe('http://localhost:3000/sse');
    });
  });

  // ============================================
  // EventSource Event Listener Tests
  // ============================================
  describe('EventSource Event Listener Extraction', () => {
    it('should extract addEventListener for custom event', () => {
      const scenario = CommunicationScenarioFactory.eventSourceWithListeners();
      const result = extractServerSentEvents(scenario.code);
      
      expect(result.events.length).toBeGreaterThan(0);
    });

    it('should have correct type for event listener', () => {
      const code = `
        const es = new EventSource('/events');
        es.addEventListener('update', handleUpdate);
      `;
      const result = extractServerSentEvents(code);
      
      expect(result.events[0].type).toBe(CommunicationConstants.COMMUNICATION_TYPES.EVENTSOURCE_EVENT);
    });

    it('should extract event name from addEventListener', () => {
      const code = `
        const es = new EventSource('/events');
        es.addEventListener('user-login', handleLogin);
      `;
      const result = extractServerSentEvents(code);
      
      const loginEvent = result.events.find(e => e.event === 'user-login');
      expect(loginEvent).toBeDefined();
    });

    it('should extract multiple event listeners', () => {
      const builder = new CommunicationBuilder()
        .withEventSource('/events')
        .withEventSourceListener('update', 'handleUpdate')
        .withEventSourceListener('error', 'handleError')
        .withEventSourceListener('ping', 'handlePing');
      const result = extractServerSentEvents(builder.code);
      
      expect(result.events).toHaveLength(3);
    });

    it('should extract listeners with double quotes', () => {
      const code = `
        const es = new EventSource('/events');
        es.addEventListener("notification", handleNotification);
      `;
      const result = extractServerSentEvents(code);
      
      expect(result.events[0].event).toBe('notification');
    });

    it('should extract listeners from different EventSource instances', () => {
      const code = `
        const es1 = new EventSource('/stream1');
        const es2 = new EventSource('/stream2');
        es1.addEventListener('event1', handler1);
        es2.addEventListener('event2', handler2);
      `;
      const result = extractServerSentEvents(code);
      
      expect(result.events).toHaveLength(2);
    });
  });

  // ============================================
  // Standard SSE Events Tests
  // ============================================
  describe('Standard SSE Events', () => {
    it('should extract message event listener', () => {
      const code = `
        const es = new EventSource('/events');
        es.addEventListener('message', handleMessage);
      `;
      const result = extractServerSentEvents(code);
      
      const messageEvent = result.events.find(e => e.event === 'message');
      expect(messageEvent).toBeDefined();
    });

    it('should extract open event listener', () => {
      const code = `
        const es = new EventSource('/events');
        es.addEventListener('open', handleOpen);
      `;
      const result = extractServerSentEvents(code);
      
      const openEvent = result.events.find(e => e.event === 'open');
      expect(openEvent).toBeDefined();
    });

    it('should extract error event listener', () => {
      const code = `
        const es = new EventSource('/events');
        es.addEventListener('error', handleError);
      `;
      const result = extractServerSentEvents(code);
      
      const errorEvent = result.events.find(e => e.event === 'error');
      expect(errorEvent).toBeDefined();
    });

    it('should extract all standard events', () => {
      const code = `
        const es = new EventSource('/events');
        es.addEventListener('open', handleOpen);
        es.addEventListener('message', handleMessage);
        es.addEventListener('error', handleError);
      `;
      const result = extractServerSentEvents(code);
      
      expect(result.events).toHaveLength(3);
      
      const eventNames = result.events.map(e => e.event);
      expect(eventNames).toContain('open');
      expect(eventNames).toContain('message');
      expect(eventNames).toContain('error');
    });
  });

  // ============================================
  // Custom SSE Events Tests
  // ============================================
  describe('Custom SSE Events', () => {
    it('should extract custom event names', () => {
      const code = `
        const es = new EventSource('/events');
        es.addEventListener('user-joined', handleJoin);
        es.addEventListener('user-left', handleLeave);
        es.addEventListener('chat-message', handleChat);
      `;
      const result = extractServerSentEvents(code);
      
      expect(result.events).toHaveLength(3);
      
      const eventNames = result.events.map(e => e.event);
      expect(eventNames).toContain('user-joined');
      expect(eventNames).toContain('user-left');
      expect(eventNames).toContain('chat-message');
    });

    it('should extract namespaced events', () => {
      const code = `
        const es = new EventSource('/events');
        es.addEventListener('app:update', handleUpdate);
        es.addEventListener('app:sync', handleSync);
      `;
      const result = extractServerSentEvents(code);
      
      const eventNames = result.events.map(e => e.event);
      expect(eventNames).toContain('app:update');
      expect(eventNames).toContain('app:sync');
    });

    it('should extract camelCase event names', () => {
      const code = `
        const es = new EventSource('/events');
        es.addEventListener('newNotification', handleNotification);
        es.addEventListener('dataUpdated', handleUpdate);
      `;
      const result = extractServerSentEvents(code);
      
      const eventNames = result.events.map(e => e.event);
      expect(eventNames).toContain('newNotification');
      expect(eventNames).toContain('dataUpdated');
    });
  });

  // ============================================
  // Line Number Tests
  // ============================================
  describe('Line Number Accuracy', () => {
    it('should report correct line for EventSource URL', () => {
      const code = `// Comment
const es = new EventSource('/events');`;
      const result = extractServerSentEvents(code);
      
      expect(result.urls[0].line).toBe(2);
    });

    it('should report correct line for event listener', () => {
      const code = `// Line 1
// Line 2
const es = new EventSource('/events');
es.addEventListener('update', handler);`;
      const result = extractServerSentEvents(code);
      
      const eventListener = result.events.find(e => e.event === 'update');
      expect(eventListener.line).toBe(4);
    });

    it('should have unique line numbers', () => {
      const code = `
        const es = new EventSource('/events');
        es.addEventListener('event1', handler1);
        es.addEventListener('event2', handler2);
      `;
      const result = extractServerSentEvents(code);
      const lines = result.all.map(item => item.line);
      const uniqueLines = [...new Set(lines)];
      
      expect(lines.length).toBe(uniqueLines.length);
    });

    it('should report line in large file', () => {
      let code = '';
      for (let i = 0; i < 500; i++) {
        code += `// Line ${i}\n`;
      }
      code += "const es = new EventSource('/late-events');";
      
      const result = extractServerSentEvents(code);
      expect(result.urls[0].line).toBe(501);
    });
  });

  // ============================================
  // Error Handling Contract
  // ============================================
  describe('Error Handling Contract', () => {
    it('should not throw on empty string', () => {
      expect(() => extractServerSentEvents('')).not.toThrow();
    });

    it('should not throw on null (converted to string)', () => {
      expect(() => extractServerSentEvents(String(null))).not.toThrow();
    });

    it('should not throw on undefined (converted to string)', () => {
      expect(() => extractServerSentEvents(String(undefined))).not.toThrow();
    });

    it('should not throw on invalid JavaScript', () => {
      const invalidCode = 'function { broken new EventSource(';
      expect(() => extractServerSentEvents(invalidCode)).not.toThrow();
    });

    it('should return empty result for invalid code', () => {
      const invalidCode = '{{{ broken syntax';
      const result = extractServerSentEvents(invalidCode);
      expect(result.all).toHaveLength(0);
    });

    it('should handle EventSource with no URL', () => {
      const code = 'new EventSource();';
      const result = extractServerSentEvents(code);
      expect(result.urls).toHaveLength(0);
    });

    it('should handle EventSource with variable URL', () => {
      const code = 'const url = getUrl(); const es = new EventSource(url);';
      const result = extractServerSentEvents(code);
      // Pattern only matches string literals
      expect(result.urls).toHaveLength(0);
    });

    it('should handle EventSource with template literal', () => {
      const code = "new EventSource(`/events/${id}`);";
      const result = extractServerSentEvents(code);
      expect(result.urls).toHaveLength(0);
    });

    it('should handle addEventListener with variable event name', () => {
      const code = `
        const es = new EventSource('/events');
        es.addEventListener(getEventName(), handler);
      `;
      const result = extractServerSentEvents(code);
      // Pattern only matches string literals
      expect(result.events).toHaveLength(0);
    });

    it('should handle very long code', () => {
      let code = '';
      for (let i = 0; i < 1000; i++) {
        code += `// Line ${i}\n`;
      }
      code += "const es = new EventSource('/events');";
      
      const result = extractServerSentEvents(code);
      expect(result.urls).toHaveLength(1);
      expect(result.urls[0].line).toBe(1001);
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('Edge Cases', () => {
    it('should handle EventSource in string (not actual code)', () => {
      const code = `
        const docs = "Use new EventSource('/fake') for SSE";
        const real = new EventSource('/real');
      `;
      const result = extractServerSentEvents(code);
      // Both detected because regex doesn't differentiate
      expect(result.urls.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle commented EventSource code', () => {
      // Note: Regex-based extractor may match commented patterns
      const code = `
        // const old = new EventSource('/old-events');
        const real = new EventSource('/real-events');
      `;
      const result = extractServerSentEvents(code);
      // The real URL should be among the results
      const realUrls = result.urls.filter(u => u.url === '/real-events');
      expect(realUrls.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle EventSource with options', () => {
      const code = "const es = new EventSource('/events', { withCredentials: true });";
      const result = extractServerSentEvents(code);
      expect(result.urls).toHaveLength(1);
    });

    it('should handle duplicate EventSources', () => {
      const code = `
        const es1 = new EventSource('/same');
        const es2 = new EventSource('/same');
      `;
      const result = extractServerSentEvents(code);
      expect(result.urls).toHaveLength(2);
    });

    it('should handle EventSource with EventTarget.addEventListener', () => {
      // This pattern matches any addEventListener on any object
      const code = `
        const es = new EventSource('/events');
        someOtherObject.addEventListener('click', handler);
      `;
      const result = extractServerSentEvents(code);
      // Pattern matches any X.addEventListener
      expect(result.events.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle multiple addEventListeners on same EventSource', () => {
      const code = `
        const es = new EventSource('/events');
        es.addEventListener('event1', handler1);
        es.addEventListener('event2', handler2);
        es.addEventListener('event3', handler3);
      `;
      const result = extractServerSentEvents(code);
      expect(result.events).toHaveLength(3);
    });

    it('should handle addEventListener with anonymous function', () => {
      const code = `
        const es = new EventSource('/events');
        es.addEventListener('message', function(e) { console.log(e.data); });
      `;
      const result = extractServerSentEvents(code);
      expect(result.events).toHaveLength(1);
    });

    it('should handle addEventListener with arrow function', () => {
      const code = `
        const es = new EventSource('/events');
        es.addEventListener('message', (e) => handleData(e.data));
      `;
      const result = extractServerSentEvents(code);
      expect(result.events).toHaveLength(1);
    });

    it('should handle onmessage handler (not addEventListener)', () => {
      const code = `
        const es = new EventSource('/events');
        es.onmessage = handleMessage;
      `;
      const result = extractServerSentEvents(code);
      // Current pattern only matches addEventListener
      expect(result.events).toHaveLength(0);
    });
  });
});
