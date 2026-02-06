/**
 * @fileoverview web-workers.js
 * 
 * Extrae comunicación Web Worker (postMessage/onmessage)
 * Incluye: Workers dedicados, SharedWorkers
 * 
 * @module extractors/communication/web-workers
 */

import { getLineNumber } from '../utils.js';

/**
 * Extrae comunicación Web Worker (postMessage/onmessage)
 * @param {string} code - Código fuente
 * @returns {Object} - {incoming: [], outgoing: [], all: []}
 */
export function extractWebWorkerCommunication(code) {
  const incoming = []; // Mensajes que recibe este archivo
  const outgoing = []; // Mensajes que envía este archivo
  
  // Patrones para Worker.postMessage (outgoing)
  const workerPostMessagePatterns = [
    /(\w+)\.postMessage\s*\(/g,  // worker.postMessage(...)
    /worker\.postMessage\s*\(/g,
    /new\s+Worker\s*\([^)]+\)[\s\S]*?\.postMessage\s*\(/g
  ];
  
  // Patrones para self.postMessage en Worker (outgoing desde worker)
  const selfPostMessagePattern = /self\.postMessage\s*\(/g;
  
  // Patrones para onmessage (incoming)
  const onMessagePatterns = [
    /(?:self|window)\.onmessage\s*=\s*(?:function|\(|\w+)/g,
    /(?:self|window)\.addEventListener\s*\(\s*['"]message['"]/g,
    /\w+\.onmessage\s*=\s*(?:function|\(|\w+)/g  // worker.onmessage = ...
  ];
  
  // Detectar outgoing (postMessage)
  for (const pattern of workerPostMessagePatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      outgoing.push({
        type: 'worker_postMessage',
        line: getLineNumber(code, match.index),
        direction: 'outgoing'
      });
    }
  }
  
  // Detectar self.postMessage (Worker enviando a Main)
  let match;
  while ((match = selfPostMessagePattern.exec(code)) !== null) {
    outgoing.push({
      type: 'worker_self_postMessage',
      line: getLineNumber(code, match.index),
      direction: 'outgoing'
    });
  }
  
  // Detectar incoming (onmessage)
  for (const pattern of onMessagePatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      incoming.push({
        type: 'worker_onmessage',
        line: getLineNumber(code, match.index),
        direction: 'incoming'
      });
    }
  }
  
  // Detectar new Worker() - creación de workers
  const newWorkerPattern = /new\s+(?:Worker|SharedWorker)\s*\(\s*['"]([^'"]+)['"]/g;
  while ((match = newWorkerPattern.exec(code)) !== null) {
    outgoing.push({
      type: 'worker_creation',
      workerPath: match[1],
      line: getLineNumber(code, match.index),
      direction: 'creates_worker'
    });
  }
  
  return { incoming, outgoing, all: [...incoming, ...outgoing] };
}

/**
 * Extrae uso de SharedWorker
 * @param {string} code - Código fuente
 * @returns {Object} - {workers: [], all: []}
 */
export function extractSharedWorkerUsage(code) {
  const workers = [];
  
  // new SharedWorker('path')
  const sharedWorkerPattern = /new\s+SharedWorker\s*\(\s*['"]([^'"]+)['"]/g;
  
  let match;
  while ((match = sharedWorkerPattern.exec(code)) !== null) {
    workers.push({
      type: 'sharedworker_creation',
      workerPath: match[1],
      line: getLineNumber(code, match.index)
    });
  }
  
  return { workers, all: workers };
}
