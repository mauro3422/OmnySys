import { getAtomSemantics } from '../atom-semantic-analyzer/index.js';
import { resolveBuilderForParam, resolveFactory } from '../factory-catalog.js';

const PARAM_NAME_MAPPINGS = [
  { pattern: /^(res|response|.*response)$/i, value: 'vi.fn(() => ({ status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(), send: vi.fn().mockReturnThis() }))' },
  { pattern: /^(req|request|.*request)$/i, value: '{ body: {}, params: {}, query: {}, headers: {}, method: "GET", path: "/test" }' },
  { pattern: /^state$/i, value: '{ paused: false, resume: vi.fn(), pause: vi.fn() }' },
  { pattern: /(next|callback)/i, value: 'vi.fn()' },
  { pattern: /(path|file)/i, value: '"/test/file.js"' },
  { pattern: /url/i, value: '"https://example.com"' },
  { pattern: /id/i, value: '"test-id"' },
  { pattern: /name/i, value: '"test-name"' },
  { pattern: /(code|source)/i, value: '"const x = 1;"' },
  { pattern: /(text|content)/i, value: '"sample text"' },
  { pattern: /(options|opts|config)/i, value: '{ enabled: true }' },
  { pattern: /(callback|fn|handler)/i, value: 'vi.fn()' },
  { pattern: /(arr|list|items)/i, value: '[]' },
  { pattern: /(num|count|limit)/i, value: '10' },
  { pattern: /(bool|flag)/i, value: 'true' },
];

const TYPE_MAPPINGS = {
  string: '"sample-string"',
  number: '42',
  boolean: 'true',
  array: '[]',
  object: '{}',
  function: 'vi.fn()',
};

function inferFallbackValue(input, callGraph = {}) {
  const n = (input.name || '').toLowerCase();
  const t = (input.type || '').toLowerCase();
  const calls = callGraph?.callsList || [];
  const hasHttpCall = calls.some(call => ['status', 'json', 'send', 'redirect'].includes(call.name));

  if (hasHttpCall && (n === 'res' || n === 'response')) {
    return 'vi.fn(() => ({ status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(), send: vi.fn().mockReturnThis() }))';
  }
  if (hasHttpCall && (n === 'req' || n === 'request')) {
    return '{ body: {}, params: {}, query: {}, headers: {}, method: "GET", path: "/test" }';
  }

  for (const { pattern, value } of PARAM_NAME_MAPPINGS) {
    if (pattern.test(n)) {
      return value;
    }
  }

  return TYPE_MAPPINGS[t] || '{}';
}

function inferFallbackFromHint(hint, callGraph = {}) {
  const { name, type, methods, isMutated } = hint;

  if (type === 'ast-node') {
    const nodeProps = methods.filter(method => !['parent', 'child'].includes(method)).slice(0, 3);
    const propStr = nodeProps.length > 0
      ? nodeProps.map(method => `${method}: 'test-${method}'`).join(', ')
      : 'type: "identifier", id: 1, startIndex: 0, endIndex: 5';
    return `{ type: 'identifier', id: 1, startIndex: 0, endIndex: 5, parent: null, ${propStr} }`;
  }

  if (isMutated && methods.length > 0) {
    const spies = methods.slice(0, 3).map(method => `${method}: vi.fn()`).join(', ');
    return `{ ${spies} }`;
  }

  return inferFallbackValue({ name, type }, callGraph);
}

export function generateInputCall(inputs, testInputs, atom) {
  if (!inputs || inputs.length === 0) {
    return '';
  }

  const factoryEntry = atom ? resolveFactory(atom.filePath) : null;
  const callGraph = atom?.callGraph || {};
  const semantics = atom ? getAtomSemantics(atom) : null;
  const paramHints = semantics?.paramHints || [];

  return inputs.map(input => {
    if (testInputs && input.name in testInputs) {
      return testInputs[input.name];
    }

    if (factoryEntry) {
      const builder = resolveBuilderForParam(input.name, factoryEntry);
      if (builder) {
        return builder.call;
      }
    }

    const hint = paramHints.find(paramHint => paramHint.name === input.name);
    if (hint) {
      return inferFallbackFromHint(hint, callGraph);
    }

    return inferFallbackValue(input, callGraph);
  }).join(', ');
}
