/**
 * @fileoverview broadcast-channel.test.js
 * 
 * Comprehensive tests for BroadcastChannel extractor
 * Tests channel creation and cross-tab communication detection
 * 
 * @module tests/unit/layer-a-analysis/extractors/communication/broadcast-channel
 */

import { describe, it, expect } from 'vitest';
import { extractBroadcastChannel } from '#layer-a/extractors/communication/broadcast-channel.js';
import {
  CommunicationBuilder,
  CommunicationScenarioFactory,
  CommunicationExtractorContracts,
  CommunicationConstants
} from '../../../../factories/extractor-test.factory.js';

describe('BroadcastChannel Extractor', () => {
  // ============================================
  // Structure Contract Tests
  // ============================================
  describe('Structure Contract', () => {
    it('should return object with required fields', () => {
      const result = extractBroadcastChannel('');
      
      CommunicationExtractorContracts.REQUIRED_BROADCAST_CHANNEL_FIELDS.forEach(field => {
        expect(result).toHaveProperty(field);
      });
    });

    it('should have channels as array', () => {
      const result = extractBroadcastChannel('');
      expect(Array.isArray(result.channels)).toBe(true);
    });

    it('should have all as array', () => {
      const result = extractBroadcastChannel('');
      expect(Array.isArray(result.all)).toBe(true);
    });

    it('should have channels same as all', () => {
      const scenario = CommunicationScenarioFactory.broadcastChannel();
      const result = extractBroadcastChannel(scenario.code);
      
      expect(result.all).toEqual(result.channels);
    });

    it('should return empty arrays for empty code', () => {
      const result = extractBroadcastChannel('');
      expect(result.channels).toHaveLength(0);
      expect(result.all).toHaveLength(0);
    });

    it('should return empty arrays for code without BroadcastChannel', () => {
      const scenario = CommunicationScenarioFactory.codeWithoutCommunication();
      const result = extractBroadcastChannel(scenario.code);
      expect(result.channels).toHaveLength(0);
    });
  });

  // ============================================
  // Channel Creation Tests
  // ============================================
  describe('BroadcastChannel Creation', () => {
    it('should extract new BroadcastChannel() with single quotes', () => {
      const scenario = CommunicationScenarioFactory.broadcastChannel('my-channel');
      const result = extractBroadcastChannel(scenario.code);
      
      expect(result.channels).toHaveLength(1);
      expect(result.channels[0].channel).toBe('my-channel');
    });

    it('should extract new BroadcastChannel() with double quotes', () => {
      const code = 'const bc = new BroadcastChannel("app-updates");';
      const result = extractBroadcastChannel(code);
      
      expect(result.channels).toHaveLength(1);
      expect(result.channels[0].channel).toBe('app-updates');
    });

    it('should have correct type for channel', () => {
      const scenario = CommunicationScenarioFactory.broadcastChannel();
      const result = extractBroadcastChannel(scenario.code);
      
      expect(result.channels[0].type).toBe(CommunicationConstants.COMMUNICATION_TYPES.BROADCAST_CHANNEL);
    });

    it('should extract multiple BroadcastChannels', () => {
      const builder = new CommunicationBuilder()
        .withBroadcastChannel('channel-1')
        .withBroadcastChannel('channel-2')
        .withBroadcastChannel('channel-3');
      const result = extractBroadcastChannel(builder.code);
      
      expect(result.channels).toHaveLength(3);
    });

    it('should extract channel with alphanumeric name', () => {
      const builder = new CommunicationBuilder()
        .withBroadcastChannel('app_v1_channel');
      const result = extractBroadcastChannel(builder.code);
      
      expect(result.channels[0].channel).toBe('app_v1_channel');
    });

    it('should extract channel with hyphenated name', () => {
      const builder = new CommunicationBuilder()
        .withBroadcastChannel('my-app-channel');
      const result = extractBroadcastChannel(builder.code);
      
      expect(result.channels[0].channel).toBe('my-app-channel');
    });

    it('should extract channel with namespaced name', () => {
      const builder = new CommunicationBuilder()
        .withBroadcastChannel('com.example.app');
      const result = extractBroadcastChannel(builder.code);
      
      expect(result.channels[0].channel).toBe('com.example.app');
    });
  });

  // ============================================
  // Channel Usage Tests (postMessage/onmessage)
  // ============================================
  describe('BroadcastChannel Usage Patterns', () => {
    it('should track channel with postMessage', () => {
      const scenario = CommunicationScenarioFactory.broadcastChannelFull('test-channel');
      const result = extractBroadcastChannel(scenario.code);
      
      expect(result.channels).toHaveLength(1);
      expect(result.channels[0].channel).toBe('test-channel');
    });

    it('should track channel with onmessage', () => {
      const code = `
        const bc = new BroadcastChannel('updates');
        bc.onmessage = handleUpdate;
      `;
      const result = extractBroadcastChannel(code);
      
      expect(result.channels).toHaveLength(1);
      expect(result.channels[0].channel).toBe('updates');
    });

    it('should track channel with addEventListener', () => {
      const code = `
        const bc = new BroadcastChannel('events');
        bc.addEventListener('message', handleEvent);
      `;
      const result = extractBroadcastChannel(code);
      
      expect(result.channels).toHaveLength(1);
      expect(result.channels[0].channel).toBe('events');
    });

    it('should only capture creation, not usage patterns', () => {
      // Current implementation only captures new BroadcastChannel()
      const code = `
        const bc = new BroadcastChannel('test');
        bc.postMessage('hello');
        bc.onmessage = handler;
        bc.addEventListener('message', handler);
      `;
      const result = extractBroadcastChannel(code);
      
      // Should only have the creation, not separate entries for usage
      expect(result.channels).toHaveLength(1);
    });
  });

  // ============================================
  // Channel Name Pattern Tests
  // ============================================
  describe('Channel Name Patterns', () => {
    it('should handle simple name', () => {
      const builder = new CommunicationBuilder()
        .withBroadcastChannel('simple');
      const result = extractBroadcastChannel(builder.code);
      
      expect(result.channels[0].channel).toBe('simple');
    });

    it('should handle camelCase name', () => {
      const builder = new CommunicationBuilder()
        .withBroadcastChannel('myAppChannel');
      const result = extractBroadcastChannel(builder.code);
      
      expect(result.channels[0].channel).toBe('myAppChannel');
    });

    it('should handle PascalCase name', () => {
      const builder = new CommunicationBuilder()
        .withBroadcastChannel('MyAppChannel');
      const result = extractBroadcastChannel(builder.code);
      
      expect(result.channels[0].channel).toBe('MyAppChannel');
    });

    it('should handle snake_case name', () => {
      const builder = new CommunicationBuilder()
        .withBroadcastChannel('my_app_channel');
      const result = extractBroadcastChannel(builder.code);
      
      expect(result.channels[0].channel).toBe('my_app_channel');
    });

    it('should handle kebab-case name', () => {
      const builder = new CommunicationBuilder()
        .withBroadcastChannel('my-app-channel');
      const result = extractBroadcastChannel(builder.code);
      
      expect(result.channels[0].channel).toBe('my-app-channel');
    });

    it('should handle name with numbers', () => {
      const builder = new CommunicationBuilder()
        .withBroadcastChannel('channel123');
      const result = extractBroadcastChannel(builder.code);
      
      expect(result.channels[0].channel).toBe('channel123');
    });

    it('should handle name starting with number-like', () => {
      const builder = new CommunicationBuilder()
        .withBroadcastChannel('v1channel');
      const result = extractBroadcastChannel(builder.code);
      
      expect(result.channels[0].channel).toBe('v1channel');
    });
  });

  // ============================================
  // Line Number Tests
  // ============================================
  describe('Line Number Accuracy', () => {
    it('should report correct line for single channel', () => {
      const code = `// Comment
const bc = new BroadcastChannel('test-channel');`;
      const result = extractBroadcastChannel(code);
      
      expect(result.channels[0].line).toBe(2);
    });

    it('should report correct line for multiple channels', () => {
      const code = `// Line 1
const bc1 = new BroadcastChannel('channel1');
// Line 3
const bc2 = new BroadcastChannel('channel2');`;
      const result = extractBroadcastChannel(code);
      
      expect(result.channels[0].line).toBe(2);
      expect(result.channels[1].line).toBe(4);
    });

    it('should have unique line numbers', () => {
      const builder = new CommunicationBuilder()
        .withBroadcastChannel('c1')
        .withBroadcastChannel('c2')
        .withBroadcastChannel('c3');
      const result = extractBroadcastChannel(builder.code);
      const lines = result.channels.map(c => c.line);
      const uniqueLines = [...new Set(lines)];
      
      expect(lines.length).toBe(uniqueLines.length);
    });

    it('should report line in large file', () => {
      let code = '';
      for (let i = 0; i < 500; i++) {
        code += `// Line ${i}\n`;
      }
      code += "const bc = new BroadcastChannel('late-channel');";
      
      const result = extractBroadcastChannel(code);
      expect(result.channels[0].line).toBe(501);
    });
  });

  // ============================================
  // Error Handling Contract
  // ============================================
  describe('Error Handling Contract', () => {
    it('should not throw on empty string', () => {
      expect(() => extractBroadcastChannel('')).not.toThrow();
    });

    it('should not throw on null (converted to string)', () => {
      expect(() => extractBroadcastChannel(String(null))).not.toThrow();
    });

    it('should not throw on undefined (converted to string)', () => {
      expect(() => extractBroadcastChannel(String(undefined))).not.toThrow();
    });

    it('should not throw on invalid JavaScript', () => {
      const invalidCode = 'function { broken new BroadcastChannel(';
      expect(() => extractBroadcastChannel(invalidCode)).not.toThrow();
    });

    it('should return empty result for invalid code', () => {
      const invalidCode = '{{{ broken syntax';
      const result = extractBroadcastChannel(invalidCode);
      expect(result.all).toHaveLength(0);
    });

    it('should handle BroadcastChannel with no name', () => {
      const code = 'new BroadcastChannel();';
      const result = extractBroadcastChannel(code);
      expect(result.channels).toHaveLength(0);
    });

    it('should handle BroadcastChannel with variable name', () => {
      const code = 'const name = getChannelName(); const bc = new BroadcastChannel(name);';
      const result = extractBroadcastChannel(code);
      // Pattern only matches string literals
      expect(result.channels).toHaveLength(0);
    });

    it('should handle BroadcastChannel with template literal', () => {
      const code = "new BroadcastChannel(`channel-${id}`);";
      const result = extractBroadcastChannel(code);
      expect(result.channels).toHaveLength(0);
    });

    it('should handle very long code', () => {
      let code = '';
      for (let i = 0; i < 1000; i++) {
        code += `// Line ${i}\n`;
      }
      code += "const bc = new BroadcastChannel('test');";
      
      const result = extractBroadcastChannel(code);
      expect(result.channels).toHaveLength(1);
      expect(result.channels[0].line).toBe(1001);
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('Edge Cases', () => {
    it('should handle BroadcastChannel in string (not actual code)', () => {
      const code = `
        const docs = "Use new BroadcastChannel('fake') for communication";
        const real = new BroadcastChannel('real');
      `;
      const result = extractBroadcastChannel(code);
      // Both detected because regex doesn't differentiate
      expect(result.channels.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle commented BroadcastChannel code', () => {
      // Note: Regex-based extractor may match commented patterns
      const code = `
        // const old = new BroadcastChannel('old-channel');
        const real = new BroadcastChannel('real-channel');
      `;
      const result = extractBroadcastChannel(code);
      // The real channel should be among the results
      const realChannels = result.channels.filter(c => c.channel === 'real-channel');
      expect(realChannels.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle duplicate channel names', () => {
      const code = `
        const bc1 = new BroadcastChannel('shared');
        const bc2 = new BroadcastChannel('shared');
      `;
      const result = extractBroadcastChannel(code);
      // Both detected - caller decides how to handle duplicates
      expect(result.channels).toHaveLength(2);
      expect(result.channels[0].channel).toBe('shared');
      expect(result.channels[1].channel).toBe('shared');
    });

    it('should handle channel creation with spaces', () => {
      const code = "const bc = new BroadcastChannel(  'spaced'  );";
      const result = extractBroadcastChannel(code);
      expect(result.channels).toHaveLength(1);
      expect(result.channels[0].channel).toBe('spaced');
    });

    it('should handle multiple channels on same line', () => {
      const code = "const bc1 = new BroadcastChannel('c1'); const bc2 = new BroadcastChannel('c2');";
      const result = extractBroadcastChannel(code);
      expect(result.channels).toHaveLength(2);
    });

    it('should handle channel name with special characters', () => {
      // Some special characters are allowed in BroadcastChannel names
      const code = "new BroadcastChannel('channel@v2.0');";
      const result = extractBroadcastChannel(code);
      expect(result.channels[0].channel).toBe('channel@v2.0');
    });

    it('should not detect BroadcastChannel as property', () => {
      const code = `
        const obj = {
          BroadcastChannel: 'not a real one'
        };
      `;
      const result = extractBroadcastChannel(code);
      expect(result.channels).toHaveLength(0);
    });

    it('should handle reassigned channel variable', () => {
      const code = `
        let bc = new BroadcastChannel('first');
        bc = new BroadcastChannel('second');
      `;
      const result = extractBroadcastChannel(code);
      expect(result.channels).toHaveLength(2);
    });
  });
});
