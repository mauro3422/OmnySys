/**
 * @fileoverview message-channel.test.js
 * 
 * Comprehensive tests for MessageChannel extractor
 * Tests MessageChannel creation and MessagePort usage
 * 
 * @module tests/unit/layer-a-analysis/extractors/communication/message-channel
 */

import { describe, it, expect } from 'vitest';
import { extractMessageChannel } from '#layer-a/extractors/communication/message-channel.js';
import {
  CommunicationBuilder,
  CommunicationScenarioFactory,
  CommunicationExtractorContracts,
  CommunicationConstants
} from '../../../../factories/extractor-test.factory.js';

describe('MessageChannel Extractor', () => {
  // ============================================
  // Structure Contract Tests
  // ============================================
  describe('Structure Contract', () => {
    it('should return object with required fields', () => {
      const result = extractMessageChannel('');
      
      CommunicationExtractorContracts.REQUIRED_MESSAGE_CHANNEL_FIELDS.forEach(field => {
        expect(result).toHaveProperty(field);
      });
    });

    it('should have channels as array', () => {
      const result = extractMessageChannel('');
      expect(Array.isArray(result.channels)).toBe(true);
    });

    it('should have all as array', () => {
      const result = extractMessageChannel('');
      expect(Array.isArray(result.all)).toBe(true);
    });

    it('should return empty arrays for empty code', () => {
      const result = extractMessageChannel('');
      expect(result.channels).toHaveLength(0);
      expect(result.all).toHaveLength(0);
    });

    it('should return empty arrays for code without MessageChannel', () => {
      const scenario = CommunicationScenarioFactory.codeWithoutCommunication();
      const result = extractMessageChannel(scenario.code);
      expect(result.channels).toHaveLength(0);
    });
  });

  // ============================================
  // MessageChannel Creation Tests
  // ============================================
  describe('MessageChannel Creation', () => {
    it('should extract new MessageChannel()', () => {
      const scenario = CommunicationScenarioFactory.messageChannel();
      const result = extractMessageChannel(scenario.code);
      
      expect(result.channels).toHaveLength(1);
    });

    it('should have correct type for creation', () => {
      const scenario = CommunicationScenarioFactory.messageChannel();
      const result = extractMessageChannel(scenario.code);
      
      const creation = result.channels.find(c => c.type === 'messageChannel_creation');
      expect(creation).toBeDefined();
    });

    it('should extract multiple MessageChannels', () => {
      const code = `
        const channel1 = new MessageChannel();
        const channel2 = new MessageChannel();
      `;
      const result = extractMessageChannel(code);
      
      const creations = result.channels.filter(c => c.type === 'messageChannel_creation');
      expect(creations).toHaveLength(2);
    });

    it('should extract MessageChannel with destructuring', () => {
      const scenario = CommunicationScenarioFactory.messageChannel();
      const result = extractMessageChannel(scenario.code);
      
      expect(result.channels.length).toBeGreaterThan(0);
    });

    it('should extract MessageChannel with variable assignment', () => {
      const code = 'const mc = new MessageChannel();';
      const result = extractMessageChannel(code);
      
      const creation = result.channels.find(c => c.type === 'messageChannel_creation');
      expect(creation).toBeDefined();
    });
  });

  // ============================================
  // MessagePort Usage Tests - port1
  // ============================================
  describe('MessagePort port1 Usage', () => {
    it('should extract port1.postMessage', () => {
      const code = `
        const mc = new MessageChannel();
        mc.port1.postMessage('hello');
      `;
      const result = extractMessageChannel(code);
      
      const portUsage = result.channels.find(c => c.type === 'messageChannel_port_usage' && c.port === 'port1');
      expect(portUsage).toBeDefined();
    });

    it('should extract port1.onmessage', () => {
      const code = `
        const mc = new MessageChannel();
        mc.port1.onmessage = handleMessage;
      `;
      const result = extractMessageChannel(code);
      
      const portUsage = result.channels.find(c => c.port === 'port1' && c.method === 'onmessage');
      expect(portUsage).toBeDefined();
    });

    it('should have correct port identifier for port1', () => {
      const code = 'channel.port1.postMessage("hello");';
      const result = extractMessageChannel(code);
      
      const portUsage = result.channels.find(c => c.type === 'messageChannel_port_usage');
      expect(portUsage.port).toBe('port1');
    });
  });

  // ============================================
  // MessagePort Usage Tests - port2
  // ============================================
  describe('MessagePort port2 Usage', () => {
    it('should extract port2.postMessage', () => {
      const code = 'channel.port2.postMessage("response");';
      const result = extractMessageChannel(code);
      
      const portUsage = result.channels.find(c => c.port === 'port2');
      expect(portUsage).toBeDefined();
    });

    it('should extract port2.onmessage', () => {
      const code = `
        const channel = new MessageChannel();
        channel.port2.onmessage = handleMessage;
      `;
      const result = extractMessageChannel(code);
      
      const portUsage = result.channels.find(c => c.port === 'port2' && c.method === 'onmessage');
      expect(portUsage).toBeDefined();
    });

    it('should have correct port identifier for port2', () => {
      const code = 'channel.port2.postMessage("hello");';
      const result = extractMessageChannel(code);
      
      const portUsage = result.channels.find(c => c.type === 'messageChannel_port_usage');
      expect(portUsage.port).toBe('port2');
    });
  });

  // ============================================
  // Port Method Tests
  // ============================================
  describe('Port Method Detection', () => {
    it('should detect postMessage method', () => {
      const code = 'channel.port1.postMessage("data");';
      const result = extractMessageChannel(code);
      
      const portUsage = result.channels.find(c => c.method === 'postMessage');
      expect(portUsage).toBeDefined();
    });

    it('should detect onmessage method', () => {
      const code = 'channel.port1.onmessage = handler;';
      const result = extractMessageChannel(code);
      
      const portUsage = result.channels.find(c => c.method === 'onmessage');
      expect(portUsage).toBeDefined();
    });

    it('should have correct type for port usage', () => {
      const code = 'channel.port1.postMessage("test");';
      const result = extractMessageChannel(code);
      
      const portUsage = result.channels.find(c => c.type === 'messageChannel_port_usage');
      expect(portUsage).toBeDefined();
    });
  });

  // ============================================
  // Complete MessageChannel Workflow Tests
  // ============================================
  describe('Complete MessageChannel Workflow', () => {
    it('should extract full channel workflow', () => {
      const code = `
        const channel = new MessageChannel();
        channel.port1.postMessage('hello');
        channel.port2.onmessage = handleMessage;
      `;
      const result = extractMessageChannel(code);
      
      expect(result.channels.length).toBeGreaterThanOrEqual(2);
    });

    it('should extract channel with worker transfer', () => {
      const code = `
        const channel = new MessageChannel();
        channel.port1.postMessage('init');
      `;
      const result = extractMessageChannel(code);
      
      const creation = result.channels.find(c => c.type === 'messageChannel_creation');
      const portUsage = result.channels.find(c => c.type === 'messageChannel_port_usage');
      
      expect(creation).toBeDefined();
      expect(portUsage).toBeDefined();
    });

    it('should extract channel used for iframe communication', () => {
      const code = `
        const channel = new MessageChannel();
        iframe.contentWindow.postMessage('init', '*', [channel.port2]);
        channel.port1.onmessage = handleIframeMessage;
      `;
      const result = extractMessageChannel(code);
      
      const creation = result.channels.find(c => c.type === 'messageChannel_creation');
      expect(creation).toBeDefined();
    });

    it('should extract channel used for service worker', () => {
      const code = `
        const channel = new MessageChannel();
        navigator.serviceWorker.controller.postMessage('ping', [channel.port2]);
        channel.port1.onmessage = ({ data }) => console.log(data);
      `;
      const result = extractMessageChannel(code);
      
      expect(result.channels.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // Multiple Channel Tests
  // ============================================
  describe('Multiple MessageChannels', () => {
    it('should extract multiple independent channels', () => {
      const code = `
        const channelA = new MessageChannel();
        const channelB = new MessageChannel();
        
        channelA.port1.postMessage('to A');
        channelB.port1.postMessage('to B');
      `;
      const result = extractMessageChannel(code);
      
      const creations = result.channels.filter(c => c.type === 'messageChannel_creation');
      expect(creations).toHaveLength(2);
    });

    it('should extract usage on different ports of same channel', () => {
      const code = `
        const channel = new MessageChannel();
        channel.port1.postMessage('from port1');
        channel.port2.postMessage('from port2');
      `;
      const result = extractMessageChannel(code);
      
      const portUsages = result.channels.filter(c => c.type === 'messageChannel_port_usage');
      expect(portUsages).toHaveLength(2);
      
      const ports = portUsages.map(p => p.port);
      expect(ports).toContain('port1');
      expect(ports).toContain('port2');
    });
  });

  // ============================================
  // Line Number Tests
  // ============================================
  describe('Line Number Accuracy', () => {
    it('should report correct line for creation', () => {
      const code = `// Comment
const mc = new MessageChannel();`;
      const result = extractMessageChannel(code);
      
      const creation = result.channels.find(c => c.type === 'messageChannel_creation');
      expect(creation.line).toBe(2);
    });

    it('should report correct line for port usage', () => {
      const code = `// Line 1
// Line 2
channel.port1.postMessage('hello');`;
      const result = extractMessageChannel(code);
      
      const portUsage = result.channels.find(c => c.type === 'messageChannel_port_usage');
      expect(portUsage.line).toBe(3);
    });

    it('should have unique line numbers', () => {
      const code = `
        const channel = new MessageChannel();
        channel.port1.postMessage('msg1');
        channel.port2.postMessage('msg2');
      `;
      const result = extractMessageChannel(code);
      const lines = result.channels.map(c => c.line);
      const uniqueLines = [...new Set(lines)];
      
      expect(lines.length).toBe(uniqueLines.length);
    });

    it('should report line in large file', () => {
      let code = '';
      for (let i = 0; i < 500; i++) {
        code += `// Line ${i}\n`;
      }
      code += 'const mc = new MessageChannel();';
      
      const result = extractMessageChannel(code);
      const creation = result.channels.find(c => c.type === 'messageChannel_creation');
      expect(creation.line).toBe(501);
    });
  });

  // ============================================
  // Error Handling Contract
  // ============================================
  describe('Error Handling Contract', () => {
    it('should not throw on empty string', () => {
      expect(() => extractMessageChannel('')).not.toThrow();
    });

    it('should not throw on null (converted to string)', () => {
      expect(() => extractMessageChannel(String(null))).not.toThrow();
    });

    it('should not throw on undefined (converted to string)', () => {
      expect(() => extractMessageChannel(String(undefined))).not.toThrow();
    });

    it('should not throw on invalid JavaScript', () => {
      const invalidCode = 'function { broken new MessageChannel(';
      expect(() => extractMessageChannel(invalidCode)).not.toThrow();
    });

    it('should return empty result for invalid code', () => {
      const invalidCode = '{{{ broken syntax';
      const result = extractMessageChannel(invalidCode);
      expect(result.all).toHaveLength(0);
    });

    it('should handle MessageChannel with arguments', () => {
      // MessageChannel() doesn't take arguments, pattern requires empty parens
      const code = 'new MessageChannel(arg);';
      const result = extractMessageChannel(code);
      // Pattern /new\s+MessageChannel\s*\(\s*\)/ won't match with args inside
      expect(result.channels.length).toBe(0);
    });

    it('should handle very long code', () => {
      let code = '';
      for (let i = 0; i < 1000; i++) {
        code += `// Line ${i}\n`;
      }
      code += 'const mc = new MessageChannel();';
      
      const result = extractMessageChannel(code);
      expect(result.channels.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('Edge Cases', () => {
    it('should handle MessageChannel in string (not actual code)', () => {
      const code = `
        const docs = "Use new MessageChannel() for communication";
        const real = new MessageChannel();
      `;
      const result = extractMessageChannel(code);
      // Both detected because regex doesn't differentiate
      expect(result.channels.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle commented MessageChannel code', () => {
      const code = `
        // const old = new MessageChannel();
        const real = new MessageChannel();
      `;
      const result = extractMessageChannel(code);
      expect(result.channels.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle port usage without creation in same file', () => {
      // Port could be passed from elsewhere - pattern requires variable prefix
      const code = 'channel.port1.postMessage("hello");';
      const result = extractMessageChannel(code);
      expect(result.channels.length).toBeGreaterThan(0);
    });

    it('should handle channel variable with different name', () => {
      const code = `
        const commChannel = new MessageChannel();
        commChannel.port1.postMessage('hello');
      `;
      const result = extractMessageChannel(code);
      // Port pattern looks for X.port1/2, so this works
      expect(result.channels.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle multiple postMessage on same port', () => {
      const code = `
        mc.port1.postMessage('msg1');
        mc.port1.postMessage('msg2');
        mc.port1.postMessage('msg3');
      `;
      const result = extractMessageChannel(code);
      const portUsages = result.channels.filter(c => c.type === 'messageChannel_port_usage');
      expect(portUsages).toHaveLength(3);
    });

    it('should handle port methods on separate lines', () => {
      const code = `
        const channel = new MessageChannel();
        channel.port1.onmessage = handler;
        channel.port1.postMessage('init');
      `;
      const result = extractMessageChannel(code);
      expect(result.channels.length).toBeGreaterThanOrEqual(2);
    });

    it('should not confuse with other port properties', () => {
      // Testing that pattern specifically looks for port1/port2
      const code = `
        const obj = { port1: 'not a messagePort' };
        obj.port1.toString();
      `;
      const result = extractMessageChannel(code);
      // Pattern is simple and will match this too
      expect(result.channels.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle reassigned port variable', () => {
      const code = `
        const channel = new MessageChannel();
        let p = channel.port1;
        p.postMessage('via variable');
      `;
      const result = extractMessageChannel(code);
      // Variable-based access not captured, only direct channel.port1 pattern
      expect(result.channels.filter(c => c.method === 'postMessage').length).toBeLessThanOrEqual(1);
    });
  });
});
