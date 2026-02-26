/**
 * @fileoverview network-calls.js
 * 
 * Extrae URLs usadas en fetch() o XMLHttpRequest
 * Detecta si dos archivos llaman al mismo endpoint
 * 
 * @module extractors/communication/network-calls
 */

import { getLineNumber } from '../utils.js';

/**
 * Extrae URLs usadas en fetch() o XMLHttpRequest
 * @param {string} code - Código fuente
 * @returns {Object} - {urls: [], all: []}
 */
export function extractNetworkCalls(code) {
  const urls = [];
  
  try {
    // fetch('url') o fetch("url")
    const fetchPattern = /fetch\s*\(\s*['"]([^'"]+)['"]/g;
    
    // xhr.open('GET', 'url') o xhr.open("POST", "url")
    const xhrPattern = /\.open\s*\(\s*['"][^'"]*['"]\s*,\s*['"]([^'"]+)['"]/g;
    
    // axios.get('url') o axios.post('url', ...)
    const axiosPattern = /axios\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g;
    
    let match;
    while ((match = fetchPattern.exec(code)) !== null) {
      urls.push({
        url: match[1],
        method: 'fetch',
        line: getLineNumber(code, match.index),
        type: 'network_fetch'
      });
    }
    
    while ((match = xhrPattern.exec(code)) !== null) {
      urls.push({
        url: match[1],
        method: 'xhr',
        line: getLineNumber(code, match.index),
        type: 'network_xhr'
      });
    }
    
    while ((match = axiosPattern.exec(code)) !== null) {
      urls.push({
        url: match[2],
        method: match[1],
        line: getLineNumber(code, match.index),
        type: 'network_axios'
      });
    }
  } catch (error) {
    // Silently handle regex errors or undefined code
  }
  
  return { urls, all: urls };
}
