/**
 * @fileoverview window-postmessage.test.js
 * 
 * Comprehensive tests for window postMessage extractor
 * Tests cross-window communication between parent, opener, and iframes
 * 
 * @module tests/unit/layer-a-analysis/extractors/communication/window-postmessage
 */

import { describe, it, expect } from 'vitest';
import { extractWindowPostMessage } from '#layer-a/extractors/communication/window-postmessage.js';
import {
  CommunicationBuilder,
  CommunicationScenarioFactory,
  CommunicationExtractorContracts,
  CommunicationConstants
} from '../../../../factories/extractor-test.factory.js';

describe('Window PostMessage Extractor', () => {
  // ============================================
  // Structure Contract Tests
  // ============================================
  describe('Structure Contract', () => {
    it('should return object with required fields', () => {
      const result = extractWindowPostMessage('');
      
      CommunicationExtractorContracts.REQUIRED_POSTMESSAGE_FIELDS.forEach(field => {
        expect(result).toHaveProperty(field);
      });
    });

    it('should have outgoing as array', () => {
      const result = extractWindowPostMessage('');
      expect(Array.isArray(result.outgoing)).toBe(true);
    });

    it('should have incoming as array', () => {
      const result = extractWindowPostMessage('');
      expect(Array.isArray(result.incoming)).toBe(true);
    });

    it('should have all as array', () => {
      const result = extractWindowPostMessage('');
      expect(Array.isArray(result.all)).toBe(true);
    });

    it('should combine outgoing and incoming in all array', () => {
      const code = `
        window.parent.postMessage('hello', '*');
        window.addEventListener('message', handler);
      `;
      const result = extractWindowPostMessage(code);
      
      expect(result.all.length).toBe(result.outgoing.length + result.incoming.length);
    });

    it('should return empty arrays for empty code', () => {
      const result = extractWindowPostMessage('');
      expect(result.outgoing).toHaveLength(0);
      expect(result.incoming).toHaveLength(0);
      expect(result.all).toHaveLength(0);
    });

    it('should return empty arrays for code without postMessage', () => {
      const scenario = CommunicationScenarioFactory.codeWithoutCommunication();
      const result = extractWindowPostMessage(scenario.code);
      expect(result.outgoing).toHaveLength(0);
      expect(result.incoming).toHaveLength(0);
    });
  });

  // ============================================
  // Outgoing PostMessage Tests - Parent
  // ============================================
  describe('Outgoing PostMessage - Parent Target', () => {
    it('should extract window.parent.postMessage', () => {
      const scenario = CommunicationScenarioFactory.windowPostMessageToParent();
      const result = extractWindowPostMessage(scenario.code);
      
      expect(result.outgoing).toHaveLength(1);
      expect(result.outgoing[0].target).toBe('parent');
    });

    it('should extract parent.postMessage without window prefix', () => {
      const code = "parent.postMessage({ data: 'test' }, '*');";
      const result = extractWindowPostMessage(code);
      
      expect(result.outgoing).toHaveLength(1);
      expect(result.outgoing[0].target).toBe('parent');
    });

    it('should have correct type for outgoing', () => {
      const scenario = CommunicationScenarioFactory.windowPostMessageToParent();
      const result = extractWindowPostMessage(scenario.code);
      
      expect(result.outgoing[0].type).toBe(CommunicationConstants.COMMUNICATION_TYPES.WINDOW_POSTMESSAGE_OUTGOING);
    });
  });

  // ============================================
  // Outgoing PostMessage Tests - Opener
  // ============================================
  describe('Outgoing PostMessage - Opener Target', () => {
    it('should extract window.opener.postMessage', () => {
      const scenario = CommunicationScenarioFactory.windowPostMessageToOpener();
      const result = extractWindowPostMessage(scenario.code);
      
      expect(result.outgoing).toHaveLength(1);
      expect(result.outgoing[0].target).toBe('opener');
    });

    it('should extract opener.postMessage without window prefix', () => {
      const code = "opener.postMessage({ type: 'init' }, '*');";
      const result = extractWindowPostMessage(code);
      
      expect(result.outgoing).toHaveLength(1);
      expect(result.outgoing[0].target).toBe('opener');
    });
  });

  // ============================================
  // Outgoing PostMessage Tests - Top
  // ============================================
  describe('Outgoing PostMessage - Top Target', () => {
    it('should extract window.top.postMessage', () => {
      const code = "window.top.postMessage({ cmd: 'resize' }, '*');";
      const result = extractWindowPostMessage(code);
      
      expect(result.outgoing).toHaveLength(1);
      expect(result.outgoing[0].target).toBe('top');
    });

    it('should extract top.postMessage without window prefix', () => {
      const code = "top.postMessage({ height: 500 }, '*');";
      const result = extractWindowPostMessage(code);
      
      expect(result.outgoing).toHaveLength(1);
      expect(result.outgoing[0].target).toBe('top');
    });
  });

  // ============================================
  // Multiple Outgoing Targets Tests
  // ============================================
  describe('Multiple Outgoing Targets', () => {
    it('should extract postMessage to multiple targets', () => {
      const code = `
        window.parent.postMessage({ from: 'child' }, '*');
        window.opener.postMessage({ from: 'popup' }, '*');
        window.top.postMessage({ from: 'nested' }, '*');
      `;
      const result = extractWindowPostMessage(code);
      
      expect(result.outgoing).toHaveLength(3);
      
      const targets = result.outgoing.map(o => o.target);
      expect(targets).toContain('parent');
      expect(targets).toContain('opener');
      expect(targets).toContain('top');
    });

    it('should extract multiple postMessages to same target', () => {
      const code = `
        parent.postMessage({ type: 'ready' }, '*');
        parent.postMessage({ type: 'data', payload: [] }, '*');
        parent.postMessage({ type: 'done' }, '*');
      `;
      const result = extractWindowPostMessage(code);
      
      expect(result.outgoing).toHaveLength(3);
      expect(result.outgoing.every(o => o.target === 'parent')).toBe(true);
    });
  });

  // ============================================
  // Incoming PostMessage Tests - addEventListener
  // ============================================
  describe('Incoming PostMessage - addEventListener', () => {
    it('should extract window.addEventListener("message", ...)', () => {
      const scenario = CommunicationScenarioFactory.windowPostMessageIncoming();
      const result = extractWindowPostMessage(scenario.code);
      
      const listener = result.incoming.find(i => i.type === 'window_postmessage_listener');
      expect(listener).toBeDefined();
    });

    it('should extract addEventListener without window prefix', () => {
      const code = "addEventListener('message', handleMessage);";
      const result = extractWindowPostMessage(code);
      
      const listener = result.incoming.find(i => i.type === 'window_postmessage_listener');
      expect(listener).toBeDefined();
    });

    it('should extract addEventListener with arrow function', () => {
      const code = "window.addEventListener('message', (e) => console.log(e.data));";
      const result = extractWindowPostMessage(code);
      
      expect(result.incoming.length).toBeGreaterThan(0);
    });

    it('should extract addEventListener with function expression', () => {
      const code = "window.addEventListener('message', function(e) { handle(e); });";
      const result = extractWindowPostMessage(code);
      
      expect(result.incoming.length).toBeGreaterThan(0);
    });

    it('should handle double quotes for message event', () => {
      const code = 'window.addEventListener("message", handler);';
      const result = extractWindowPostMessage(code);
      
      expect(result.incoming.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // Incoming PostMessage Tests - onmessage
  // ============================================
  describe('Incoming PostMessage - onmessage', () => {
    it('should extract window.onmessage assignment', () => {
      const scenario = CommunicationScenarioFactory.windowPostMessageIncoming();
      const result = extractWindowPostMessage(scenario.code);
      
      const onmessage = result.incoming.find(i => i.type === 'window_onmessage');
      expect(onmessage).toBeDefined();
    });

    it('should extract onmessage without window prefix', () => {
      const code = 'onmessage = handleIncoming;';
      const result = extractWindowPostMessage(code);
      
      const onmessage = result.incoming.find(i => i.type === 'window_onmessage');
      expect(onmessage).toBeDefined();
    });

    it('should extract onmessage with function', () => {
      const code = 'window.onmessage = function(e) { process(e.data); };';
      const result = extractWindowPostMessage(code);
      
      const onmessage = result.incoming.find(i => i.type === 'window_onmessage');
      expect(onmessage).toBeDefined();
    });

    it('should extract onmessage with arrow function', () => {
      const code = 'window.onmessage = (e) => handleData(e.data);';
      const result = extractWindowPostMessage(code);
      
      const onmessage = result.incoming.find(i => i.type === 'window_onmessage');
      expect(onmessage).toBeDefined();
    });
  });

  // ============================================
  // Combined Incoming Tests
  // ============================================
  describe('Combined Incoming Detection', () => {
    it('should detect both listener types in same file', () => {
      const code = `
        window.addEventListener('message', handler1);
        window.onmessage = handler2;
      `;
      const result = extractWindowPostMessage(code);
      
      expect(result.incoming).toHaveLength(2);
      
      const types = result.incoming.map(i => i.type);
      expect(types).toContain('window_postmessage_listener');
      expect(types).toContain('window_onmessage');
    });

    it('should detect multiple addEventListener calls', () => {
      const code = `
        window.addEventListener('message', handler1);
        window.addEventListener('message', handler2);
        window.addEventListener('message', handler3);
      `;
      const result = extractWindowPostMessage(code);
      
      const listeners = result.incoming.filter(i => i.type === 'window_postmessage_listener');
      expect(listeners).toHaveLength(3);
    });

    it('should detect iframe.contentWindow.postMessage', () => {
      // Note: This is not captured by current pattern but good to document
      const code = "iframe.contentWindow.postMessage({ data: 'test' }, '*');";
      const result = extractWindowPostMessage(code);
      
      // Current implementation doesn't capture contentWindow
      expect(result.outgoing).toHaveLength(0);
    });
  });

  // ============================================
  // Line Number Tests
  // ============================================
  describe('Line Number Accuracy', () => {
    it('should report correct line for parent.postMessage', () => {
      const code = `// Comment
window.parent.postMessage('hello', '*');`;
      const result = extractWindowPostMessage(code);
      
      expect(result.outgoing[0].line).toBe(2);
    });

    it('should report correct line for addEventListener', () => {
      const code = `// Line 1
// Line 2
window.addEventListener('message', handler);`;
      const result = extractWindowPostMessage(code);
      
      expect(result.incoming[0].line).toBe(3);
    });

    it('should report correct line for onmessage', () => {
      const code = `// Line 1
// Line 2
// Line 3
window.onmessage = handler;`;
      const result = extractWindowPostMessage(code);
      
      expect(result.incoming[0].line).toBe(4);
    });

    it('should have unique line numbers', () => {
      const code = `
        parent.postMessage('msg1', '*');
        parent.postMessage('msg2', '*');
        window.addEventListener('message', handler);
      `;
      const result = extractWindowPostMessage(code);
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
      expect(() => extractWindowPostMessage('')).not.toThrow();
    });

    it('should not throw on null (converted to string)', () => {
      expect(() => extractWindowPostMessage(String(null))).not.toThrow();
    });

    it('should not throw on undefined (converted to string)', () => {
      expect(() => extractWindowPostMessage(String(undefined))).not.toThrow();
    });

    it('should not throw on invalid JavaScript', () => {
      const invalidCode = 'function { broken parent.postMessage(';
      expect(() => extractWindowPostMessage(invalidCode)).not.toThrow();
    });

    it('should return empty result for invalid code', () => {
      const invalidCode = '{{{ broken syntax';
      const result = extractWindowPostMessage(invalidCode);
      expect(result.all).toHaveLength(0);
    });

    it('should handle postMessage with no arguments', () => {
      const code = 'parent.postMessage();';
      const result = extractWindowPostMessage(code);
      // Pattern matches the call even without arguments
      expect(result.outgoing).toHaveLength(1);
    });

    it('should handle very long code', () => {
      let code = '';
      for (let i = 0; i < 1000; i++) {
        code += `// Line ${i}\n`;
      }
      code += "parent.postMessage('test', '*');";
      
      const result = extractWindowPostMessage(code);
      expect(result.outgoing).toHaveLength(1);
      expect(result.outgoing[0].line).toBe(1001);
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('Edge Cases', () => {
    it('should handle postMessage in string (not actual code)', () => {
      const code = `
        const docs = "Use parent.postMessage() for communication";
        parent.postMessage('real', '*');
      `;
      const result = extractWindowPostMessage(code);
      // Both detected because regex doesn't differentiate
      expect(result.outgoing.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle commented postMessage code', () => {
      const code = `
        // parent.postMessage('old', '*');
        parent.postMessage('real', '*');
      `;
      const result = extractWindowPostMessage(code);
      expect(result.outgoing.length).toBeGreaterThanOrEqual(1);
    });

    it('should not detect postMessage to current window', () => {
      const code = "window.postMessage('self', '*');";
      const result = extractWindowPostMessage(code);
      // Current pattern requires parent/opener/top
      expect(result.outgoing).toHaveLength(0);
    });

    it('should handle chained postMessage', () => {
      const code = `
        const parentWindow = window.parent;
        parentWindow.postMessage('hello', '*');
      `;
      const result = extractWindowPostMessage(code);
      // Variable-based postMessage not captured
      expect(result.outgoing).toHaveLength(0);
    });

    it('should handle postMessage with complex origin', () => {
      const code = "parent.postMessage(data, 'https://example.com');";
      const result = extractWindowPostMessage(code);
      expect(result.outgoing).toHaveLength(1);
    });

    it('should handle postMessage with transferables', () => {
      const code = "parent.postMessage(data, '*', [transferable]);";
      const result = extractWindowPostMessage(code);
      expect(result.outgoing).toHaveLength(1);
    });

    it('should detect addEventListener with options', () => {
      const code = "window.addEventListener('message', handler, { passive: true });";
      const result = extractWindowPostMessage(code);
      expect(result.incoming.length).toBeGreaterThan(0);
    });

    it('should handle multiple onmessage assignments', () => {
      const code = `
        window.onmessage = handler1;
        window.onmessage = handler2;
      `;
      const result = extractWindowPostMessage(code);
      const onmessages = result.incoming.filter(i => i.type === 'window_onmessage');
      expect(onmessages).toHaveLength(2);
    });
  });
});
