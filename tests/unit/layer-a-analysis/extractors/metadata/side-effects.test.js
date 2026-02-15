/**
 * @fileoverview Tests for side-effects.js extractor
 * 
 * @module tests/side-effects
 */

import { describe, it, expect } from 'vitest';
import { extractSideEffects } from '#layer-a/extractors/metadata/side-effects.js';

describe('side-effects', () => {
  describe('basic structure', () => {
    it('should export extractSideEffects function', () => {
      expect(typeof extractSideEffects).toBe('function');
    });

    it('should return object with all expected properties', () => {
      const result = extractSideEffects('');
      expect(result).toHaveProperty('networkCalls');
      expect(result).toHaveProperty('domManipulations');
      expect(result).toHaveProperty('storageAccess');
      expect(result).toHaveProperty('consoleUsage');
      expect(result).toHaveProperty('timerUsage');
      expect(result).toHaveProperty('all');
    });
  });

  describe('network call detection', () => {
    it('should detect fetch calls', () => {
      const code = 'fetch("/api/data");';
      const result = extractSideEffects(code);
      expect(result.networkCalls).toHaveLength(1);
      expect(result.networkCalls[0]).toMatchObject({
        type: 'fetch',
        code: 'fetch('
      });
    });

    it('should detect axios calls', () => {
      const code = 'axios.get("/api/data");';
      const result = extractSideEffects(code);
      expect(result.networkCalls).toHaveLength(1);
      expect(result.networkCalls[0].type).toBe('axios');
    });

    it('should detect axios post calls', () => {
      const code = 'axios.post("/api/data", payload);';
      const result = extractSideEffects(code);
      expect(result.networkCalls[0].type).toBe('axios');
    });

    it('should detect XMLHttpRequest', () => {
      const code = 'new XMLHttpRequest();';
      const result = extractSideEffects(code);
      expect(result.networkCalls[0].type).toBe('xhr');
    });

    it('should detect jQuery ajax', () => {
      const code = '$.get("/api/data");';
      const result = extractSideEffects(code);
      expect(result.networkCalls[0].type).toBe('jquery');
    });

    it('should include line numbers', () => {
      const code = 'fetch("/api");';
      const result = extractSideEffects(code);
      expect(result.networkCalls[0].line).toBeDefined();
      expect(typeof result.networkCalls[0].line).toBe('number');
    });

    it('should detect multiple network calls', () => {
      const code = `
        fetch("/api/a");
        fetch("/api/b");
        axios.get("/api/c");
      `;
      const result = extractSideEffects(code);
      expect(result.networkCalls).toHaveLength(3);
    });
  });

  describe('DOM manipulation detection', () => {
    it('should detect getElementById', () => {
      const code = 'document.getElementById("app");';
      const result = extractSideEffects(code);
      expect(result.domManipulations).toHaveLength(1);
      expect(result.domManipulations[0]).toMatchObject({
        method: 'access',
        code: 'document.getElementById('
      });
    });

    it('should detect querySelector', () => {
      const code = 'document.querySelector(".class");';
      const result = extractSideEffects(code);
      expect(result.domManipulations[0].method).toBe('access');
    });

    it('should detect innerHTML assignment', () => {
      const code = 'element.innerHTML = "<div></div>";';
      const result = extractSideEffects(code);
      expect(result.domManipulations[0]).toMatchObject({
        method: 'innerHTML',
        code: '.innerHTML ='
      });
    });

    it('should detect textContent assignment', () => {
      const code = 'element.textContent = "text";';
      const result = extractSideEffects(code);
      expect(result.domManipulations[0].method).toBe('textContent');
    });

    it('should detect appendChild', () => {
      const code = 'parent.appendChild(child);';
      const result = extractSideEffects(code);
      expect(result.domManipulations[0].method).toBe('appendChild');
    });

    it('should detect removeChild', () => {
      const code = 'parent.removeChild(child);';
      const result = extractSideEffects(code);
      expect(result.domManipulations[0].method).toBe('removeChild');
    });

    it('should detect setAttribute', () => {
      const code = 'element.setAttribute("data-id", "123");';
      const result = extractSideEffects(code);
      expect(result.domManipulations[0].method).toBe('setAttribute');
    });

    it('should include line numbers', () => {
      const code = 'document.querySelector("#app");';
      const result = extractSideEffects(code);
      expect(result.domManipulations[0].line).toBeDefined();
    });
  });

  describe('storage access detection', () => {
    it('should detect localStorage getItem', () => {
      const code = 'localStorage.getItem("key");';
      const result = extractSideEffects(code);
      expect(result.storageAccess).toHaveLength(1);
      expect(result.storageAccess[0]).toMatchObject({
        type: 'webStorage',
        code: 'localStorage.getItem('
      });
    });

    it('should detect localStorage setItem', () => {
      const code = 'localStorage.setItem("key", "value");';
      const result = extractSideEffects(code);
      expect(result.storageAccess[0].type).toBe('webStorage');
    });

    it('should detect sessionStorage', () => {
      const code = 'sessionStorage.getItem("key");';
      const result = extractSideEffects(code);
      expect(result.storageAccess[0].type).toBe('webStorage');
    });

    it('should detect cookies', () => {
      const code = 'document.cookie;';
      const result = extractSideEffects(code);
      expect(result.storageAccess).toHaveLength(1);
      expect(result.storageAccess[0].type).toBe('cookie');
    });

    it('should detect indexedDB', () => {
      const code = 'indexedDB.open("myDB");';
      const result = extractSideEffects(code);
      expect(result.storageAccess[0].type).toBe('indexedDB');
    });
  });

  describe('console usage detection', () => {
    it('should detect console.log', () => {
      const code = 'console.log("message");';
      const result = extractSideEffects(code);
      expect(result.consoleUsage).toHaveLength(1);
      expect(result.consoleUsage[0]).toMatchObject({
        method: 'log',
        code: 'console.log('
      });
    });

    it('should detect console.error', () => {
      const code = 'console.error("error");';
      const result = extractSideEffects(code);
      expect(result.consoleUsage[0].method).toBe('error');
    });

    it('should detect console.warn', () => {
      const code = 'console.warn("warning");';
      const result = extractSideEffects(code);
      expect(result.consoleUsage[0].method).toBe('warn');
    });

    it('should detect console.info', () => {
      const code = 'console.info("info");';
      const result = extractSideEffects(code);
      expect(result.consoleUsage[0].method).toBe('info');
    });

    it('should detect console.debug', () => {
      const code = 'console.debug("debug");';
      const result = extractSideEffects(code);
      expect(result.consoleUsage[0].method).toBe('debug');
    });

    it('should detect console.trace', () => {
      const code = 'console.trace();';
      const result = extractSideEffects(code);
      expect(result.consoleUsage[0].method).toBe('trace');
    });

    it('should detect multiple console calls', () => {
      const code = `
        console.log("a");
        console.log("b");
        console.error("c");
      `;
      const result = extractSideEffects(code);
      expect(result.consoleUsage).toHaveLength(3);
    });
  });

  describe('timer usage detection', () => {
    it('should detect setTimeout', () => {
      const code = 'setTimeout(() => {}, 1000);';
      const result = extractSideEffects(code);
      expect(result.timerUsage).toHaveLength(1);
      expect(result.timerUsage[0]).toMatchObject({
        type: 'setTimeout',
        code: 'setTimeout('
      });
    });

    it('should detect setInterval', () => {
      const code = 'setInterval(() => {}, 5000);';
      const result = extractSideEffects(code);
      expect(result.timerUsage[0].type).toBe('setInterval');
    });

    it('should detect requestAnimationFrame', () => {
      const code = 'requestAnimationFrame(render);';
      const result = extractSideEffects(code);
      expect(result.timerUsage[0].type).toBe('requestAnimationFrame');
    });

    it('should detect clearTimeout', () => {
      const code = 'clearTimeout(timerId);';
      const result = extractSideEffects(code);
      expect(result.timerUsage[0].type).toBe('clearTimeout');
    });

    it('should detect clearInterval', () => {
      const code = 'clearInterval(intervalId);';
      const result = extractSideEffects(code);
      expect(result.timerUsage[0].type).toBe('clearInterval');
    });
  });

  describe('all array', () => {
    it('should combine all side effects', () => {
      const code = `
        fetch("/api");
        console.log("done");
        setTimeout(() => {}, 1000);
      `;
      const result = extractSideEffects(code);
      expect(result.all.length).toBeGreaterThanOrEqual(2);
    });

    it('should categorize items correctly', () => {
      const code = `
        fetch("/api");
        document.querySelector("#app");
        console.log("test");
        localStorage.getItem("key");
      `;
      const result = extractSideEffects(code);
      const categories = result.all.map(item => item.category);
      expect(categories).toContain('network');
      expect(categories).toContain('dom');
      expect(categories).toContain('console');
      expect(categories).toContain('storage');
    });
  });

  describe('edge cases', () => {
    it('should handle empty code', () => {
      const result = extractSideEffects('');
      expect(result.networkCalls).toHaveLength(0);
      expect(result.domManipulations).toHaveLength(0);
      expect(result.storageAccess).toHaveLength(0);
      expect(result.consoleUsage).toHaveLength(0);
      expect(result.timerUsage).toHaveLength(0);
      expect(result.all).toHaveLength(0);
    });

    it('should handle code without side effects', () => {
      const code = 'function pure(x) { return x * 2; }';
      const result = extractSideEffects(code);
      expect(result.all).toHaveLength(0);
    });

    it('should handle complex real-world code', () => {
      const code = `
        async function init() {
          const response = await fetch("/api/config");
          const config = await response.json();
          localStorage.setItem("config", JSON.stringify(config));
          document.getElementById("app").innerHTML = config.html;
          console.log("Initialized");
          setInterval(sync, 5000);
        }
      `;
      const result = extractSideEffects(code);
      expect(result.networkCalls.length).toBeGreaterThan(0);
      expect(result.domManipulations.length).toBeGreaterThan(0);
      expect(result.storageAccess.length).toBeGreaterThan(0);
      expect(result.consoleUsage.length).toBeGreaterThan(0);
      expect(result.timerUsage.length).toBeGreaterThan(0);
    });
  });
});
