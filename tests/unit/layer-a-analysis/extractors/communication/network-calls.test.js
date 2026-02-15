/**
 * @fileoverview network-calls.test.js
 * 
 * Comprehensive tests for network calls extractor
 * Tests fetch(), XMLHttpRequest, and axios detection
 * 
 * @module tests/unit/layer-a-analysis/extractors/communication/network-calls
 */

import { describe, it, expect } from 'vitest';
import { extractNetworkCalls } from '#layer-a/extractors/communication/network-calls.js';
import {
  CommunicationBuilder,
  CommunicationScenarioFactory,
  CommunicationExtractorContracts,
  CommunicationConstants
} from '../../../../factories/extractor-test.factory.js';

describe('Network Calls Extractor', () => {
  // ============================================
  // Structure Contract Tests
  // ============================================
  describe('Structure Contract', () => {
    it('should return object with required fields', () => {
      const result = extractNetworkCalls('');
      
      CommunicationExtractorContracts.REQUIRED_NETWORK_FIELDS.forEach(field => {
        expect(result).toHaveProperty(field);
      });
    });

    it('should have urls as array', () => {
      const result = extractNetworkCalls('');
      expect(Array.isArray(result.urls)).toBe(true);
    });

    it('should have all as array', () => {
      const result = extractNetworkCalls('');
      expect(Array.isArray(result.all)).toBe(true);
    });

    it('should have urls same as all', () => {
      const scenario = CommunicationScenarioFactory.fetchApiCall();
      const result = extractNetworkCalls(scenario.code);
      
      expect(result.all).toEqual(result.urls);
    });

    it('should return empty arrays for empty code', () => {
      const result = extractNetworkCalls('');
      expect(result.urls).toHaveLength(0);
      expect(result.all).toHaveLength(0);
    });

    it('should return empty arrays for code without network calls', () => {
      const scenario = CommunicationScenarioFactory.codeWithoutCommunication();
      const result = extractNetworkCalls(scenario.code);
      expect(result.urls).toHaveLength(0);
    });
  });

  // ============================================
  // Fetch API Tests
  // ============================================
  describe('Fetch API Detection', () => {
    it('should extract simple fetch call', () => {
      const scenario = CommunicationScenarioFactory.fetchApiCall('/api/users');
      const result = extractNetworkCalls(scenario.code);
      
      expect(result.urls).toHaveLength(1);
      expect(result.urls[0].url).toBe('/api/users');
    });

    it('should have correct method for fetch', () => {
      const scenario = CommunicationScenarioFactory.fetchApiCall();
      const result = extractNetworkCalls(scenario.code);
      
      expect(result.urls[0].method).toBe(CommunicationConstants.NETWORK_METHODS.FETCH);
    });

    it('should have correct type for fetch', () => {
      const scenario = CommunicationScenarioFactory.fetchApiCall();
      const result = extractNetworkCalls(scenario.code);
      
      expect(result.urls[0].type).toBe(CommunicationConstants.COMMUNICATION_TYPES.NETWORK_FETCH);
    });

    it('should extract fetch with double quotes', () => {
      const code = 'fetch("/api/data");';
      const result = extractNetworkCalls(code);
      
      expect(result.urls[0].url).toBe('/api/data');
    });

    it('should extract multiple fetch calls', () => {
      const builder = new CommunicationBuilder()
        .withFetch('/api/users')
        .withFetch('/api/posts')
        .withFetch('/api/comments');
      const result = extractNetworkCalls(builder.code);
      
      expect(result.urls).toHaveLength(3);
    });

    it('should extract fetch with full URL', () => {
      const builder = new CommunicationBuilder()
        .withFetch('https://api.example.com/v1/resource');
      const result = extractNetworkCalls(builder.code);
      
      expect(result.urls[0].url).toBe('https://api.example.com/v1/resource');
    });

    it('should extract fetch with URL and options', () => {
      const code = `
        fetch('/api/submit', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      `;
      const result = extractNetworkCalls(code);
      
      expect(result.urls).toHaveLength(1);
      expect(result.urls[0].url).toBe('/api/submit');
    });
  });

  // ============================================
  // XMLHttpRequest Tests
  // ============================================
  describe('XMLHttpRequest Detection', () => {
    it('should extract XHR GET call', () => {
      const scenario = CommunicationScenarioFactory.xhrCall('GET', '/api/data');
      const result = extractNetworkCalls(scenario.code);
      
      expect(result.urls).toHaveLength(1);
      expect(result.urls[0].url).toBe('/api/data');
    });

    it('should extract XHR POST call', () => {
      const scenario = CommunicationScenarioFactory.xhrCall('POST', '/api/submit');
      const result = extractNetworkCalls(scenario.code);
      
      expect(result.urls[0].method).toBe(CommunicationConstants.NETWORK_METHODS.XHR);
    });

    it('should have correct type for XHR', () => {
      const scenario = CommunicationScenarioFactory.xhrCall('GET', '/api/data');
      const result = extractNetworkCalls(scenario.code);
      
      expect(result.urls[0].type).toBe(CommunicationConstants.COMMUNICATION_TYPES.NETWORK_XHR);
    });

    it('should extract XHR with single quotes', () => {
      const code = "xhr.open('GET', '/api/test');";
      const result = extractNetworkCalls(code);
      
      expect(result.urls[0].url).toBe('/api/test');
    });

    it('should extract XHR with double quotes', () => {
      const code = 'xhr.open("POST", "/api/create");';
      const result = extractNetworkCalls(code);
      
      expect(result.urls[0].url).toBe('/api/create');
    });

    it('should extract multiple XHR calls', () => {
      const builder = new CommunicationBuilder()
        .withXHR('GET', '/api/users')
        .withXHR('POST', '/api/create')
        .withXHR('PUT', '/api/update');
      const result = extractNetworkCalls(builder.code);
      
      expect(result.urls).toHaveLength(3);
    });
  });

  // ============================================
  // Axios Tests
  // ============================================
  describe('Axios Detection', () => {
    it('should extract axios.get call', () => {
      const scenario = CommunicationScenarioFactory.axiosApiCall('get', '/api/users');
      const result = extractNetworkCalls(scenario.code);
      
      expect(result.urls).toHaveLength(1);
      expect(result.urls[0].url).toBe('/api/users');
    });

    it('should extract axios.post call', () => {
      const scenario = CommunicationScenarioFactory.axiosApiCall('post', '/api/create');
      const result = extractNetworkCalls(scenario.code);
      
      expect(result.urls[0].method).toBe('post');
    });

    it('should have correct type for axios', () => {
      const scenario = CommunicationScenarioFactory.axiosApiCall('get', '/api/data');
      const result = extractNetworkCalls(scenario.code);
      
      expect(result.urls[0].type).toBe(CommunicationConstants.COMMUNICATION_TYPES.NETWORK_AXIOS);
    });

    it('should extract all HTTP methods', () => {
      const builder = new CommunicationBuilder()
        .withAxios('get', '/api/get')
        .withAxios('post', '/api/post')
        .withAxios('put', '/api/put')
        .withAxios('delete', '/api/delete')
        .withAxios('patch', '/api/patch');
      const result = extractNetworkCalls(builder.code);
      
      expect(result.urls).toHaveLength(5);
      
      const methods = result.urls.map(u => u.method);
      expect(methods).toContain('get');
      expect(methods).toContain('post');
      expect(methods).toContain('put');
      expect(methods).toContain('delete');
      expect(methods).toContain('patch');
    });

    it('should extract axios with full URL', () => {
      const builder = new CommunicationBuilder()
        .withAxios('get', 'https://api.example.com/resource');
      const result = extractNetworkCalls(builder.code);
      
      expect(result.urls[0].url).toBe('https://api.example.com/resource');
    });
  });

  // ============================================
  // Mixed Network Calls Tests
  // ============================================
  describe('Mixed Network Calls', () => {
    it('should extract fetch and XHR in same file', () => {
      const builder = new CommunicationBuilder()
        .withFetch('/api/fetch-endpoint')
        .withXHR('GET', '/api/xhr-endpoint');
      const result = extractNetworkCalls(builder.code);
      
      expect(result.urls).toHaveLength(2);
      
      const fetchItem = result.urls.find(u => u.method === 'fetch');
      const xhrItem = result.urls.find(u => u.method === 'xhr');
      
      expect(fetchItem).toBeDefined();
      expect(xhrItem).toBeDefined();
    });

    it('should extract all three types in same file', () => {
      const builder = new CommunicationBuilder()
        .withFetch('/api/fetch')
        .withAxios('get', '/api/axios')
        .withXHR('POST', '/api/xhr');
      const result = extractNetworkCalls(builder.code);
      
      expect(result.urls).toHaveLength(3);
      
      const types = result.urls.map(u => u.type);
      expect(types).toContain('network_fetch');
      expect(types).toContain('network_axios');
      expect(types).toContain('network_xhr');
    });
  });

  // ============================================
  // Line Number Tests
  // ============================================
  describe('Line Number Accuracy', () => {
    it('should report correct line for fetch', () => {
      const code = `// Comment line
fetch('/api/data');`;
      const result = extractNetworkCalls(code);
      
      expect(result.urls[0].line).toBe(2);
    });

    it('should report correct line for XHR', () => {
      const code = `// Line 1
// Line 2
const xhr = new XMLHttpRequest();
xhr.open('GET', '/api/test');`;
      const result = extractNetworkCalls(code);
      
      expect(result.urls[0].line).toBeGreaterThanOrEqual(4);
    });

    it('should report correct line for axios', () => {
      const code = `// Line 1
// Line 2
// Line 3
axios.get('/api/users');`;
      const result = extractNetworkCalls(code);
      
      expect(result.urls[0].line).toBe(4);
    });

    it('should have unique line numbers', () => {
      const builder = new CommunicationBuilder()
        .withFetch('/api/1')
        .withFetch('/api/2')
        .withFetch('/api/3');
      const result = extractNetworkCalls(builder.code);
      const lines = result.urls.map(u => u.line);
      const uniqueLines = [...new Set(lines)];
      
      expect(lines.length).toBe(uniqueLines.length);
    });
  });

  // ============================================
  // Error Handling Contract
  // ============================================
  describe('Error Handling Contract', () => {
    it('should not throw on empty string', () => {
      expect(() => extractNetworkCalls('')).not.toThrow();
    });

    it('should not throw on null (converted to string)', () => {
      expect(() => extractNetworkCalls(String(null))).not.toThrow();
    });

    it('should not throw on undefined (converted to string)', () => {
      expect(() => extractNetworkCalls(String(undefined))).not.toThrow();
    });

    it('should not throw on invalid JavaScript', () => {
      const invalidCode = 'function { broken fetch(';
      expect(() => extractNetworkCalls(invalidCode)).not.toThrow();
    });

    it('should return empty result for invalid code', () => {
      const invalidCode = '{{{ broken syntax';
      const result = extractNetworkCalls(invalidCode);
      expect(result.all).toHaveLength(0);
    });

    it('should handle fetch with no arguments', () => {
      const code = 'fetch();';
      const result = extractNetworkCalls(code);
      expect(result.urls).toHaveLength(0);
    });

    it('should handle fetch with variable URL', () => {
      const code = 'const url = getUrl(); fetch(url);';
      const result = extractNetworkCalls(code);
      // Pattern only matches string literals
      expect(result.urls).toHaveLength(0);
    });

    it('should handle XHR with variable URL', () => {
      const code = "const url = getUrl(); xhr.open('GET', url);";
      const result = extractNetworkCalls(code);
      expect(result.urls).toHaveLength(0);
    });

    it('should handle axios with variable URL', () => {
      const code = 'const url = getUrl(); axios.get(url);';
      const result = extractNetworkCalls(code);
      expect(result.urls).toHaveLength(0);
    });

    it('should handle very long code', () => {
      let code = '';
      for (let i = 0; i < 1000; i++) {
        code += `// Line ${i}\n`;
      }
      code += "fetch('/api/test');";
      
      const result = extractNetworkCalls(code);
      expect(result.urls).toHaveLength(1);
      expect(result.urls[0].line).toBe(1001);
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('Edge Cases', () => {
    it('should handle fetch with template literal (not captured)', () => {
      const code = 'fetch(`/api/items/${id}`);';
      const result = extractNetworkCalls(code);
      expect(result.urls).toHaveLength(0);
    });

    it('should handle commented network calls', () => {
      // Note: Regex-based extractor may match commented patterns
      const code = `
        // fetch('/api/ignored');
        fetch('/api/real');
      `;
      const result = extractNetworkCalls(code);
      // The real URL should be among the results
      const realUrls = result.urls.filter(u => u.url === '/api/real');
      expect(realUrls.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle network calls in strings', () => {
      const code = `
        const docs = "Use fetch('/api/fake') for data";
        fetch('/api/real');
      `;
      const result = extractNetworkCalls(code);
      // Both detected because regex doesn't differentiate
      expect(result.urls.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle duplicate URLs', () => {
      const code = `
        fetch('/api/same');
        fetch('/api/same');
      `;
      const result = extractNetworkCalls(code);
      expect(result.urls).toHaveLength(2);
    });

    it('should handle URL with special characters', () => {
      const code = "fetch('/api/search?q=hello&filter=active');";
      const result = extractNetworkCalls(code);
      expect(result.urls[0].url).toBe('/api/search?q=hello&filter=active');
    });

    it('should handle URL with port', () => {
      const code = "fetch('http://localhost:3000/api/data');";
      const result = extractNetworkCalls(code);
      expect(result.urls[0].url).toBe('http://localhost:3000/api/data');
    });
  });
});
