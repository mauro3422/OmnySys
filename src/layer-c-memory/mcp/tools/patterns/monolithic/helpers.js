/**
 * @fileoverview Ayudantes para inferir operaciones técnicas
 */

const NAME_TO_OPERATION = [
  { keywords: ['save', 'write', 'persist'], operation: 'save/persist' },
  { keywords: ['load', 'read', 'get', 'fetch'], operation: 'read/load' },
  { keywords: ['parse', 'extract'], operation: 'parse/extract' },
  { keywords: ['transform', 'convert', 'map'], operation: 'transform/convert' },
  { keywords: ['validate', 'check'], operation: 'validate/check' },
  { keywords: ['delete', 'remove'], operation: 'delete/remove' },
  { keywords: ['create', 'new', 'build'], operation: 'create/build' },
  { keywords: ['update', 'modify'], operation: 'update/modify' },
  { keywords: ['search', 'find', 'query'], operation: 'search/query' }
];

const CALL_TO_OPERATION = [
  { keywords: ['sql', 'insert', 'update', 'delete'], operation: 'db-operation' },
  { keywords: ['http', 'fetch', 'request'], operation: 'http-request' },
  { keywords: ['json', 'parse'], operation: 'json-parse' },
  { keywords: ['file', 'fs', 'readfile', 'writefile'], operation: 'file-io' }
];

function containsKeyword(name, keywords) {
  return keywords.some(keyword => name.includes(keyword));
}

/**
 * Infiere operaciones técnicas de los nombres de funciones y sus llamadas
 */
export function inferOperations(name, calls) {
  const ops = new Set();
  const lowerName = (name || '').toLowerCase();

  for (const { keywords, operation } of NAME_TO_OPERATION) {
    if (containsKeyword(lowerName, keywords)) {
      ops.add(operation);
    }
  }

  if (Array.isArray(calls)) {
    for (const call of calls) {
      const lowerCall = (call || '').toString().toLowerCase();
      for (const { keywords, operation } of CALL_TO_OPERATION) {
        if (containsKeyword(lowerCall, keywords)) {
          ops.add(operation);
          break;
        }
      }
    }
  }

  return [...ops];
}
