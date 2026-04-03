/**
 * @fileoverview Shared safe JSON stringifier for telemetry and snapshots.
 */

export function safeJsonStringify(value) {
  const seen = new WeakSet();

  return JSON.stringify(value, (key, currentValue) => {
    if (typeof currentValue === 'bigint') {
      return Number(currentValue);
    }

    if (currentValue instanceof Error) {
      return {
        name: currentValue.name,
        message: currentValue.message,
        stack: currentValue.stack
      };
    }

    if (currentValue instanceof Map) {
      return Object.fromEntries(currentValue.entries());
    }

    if (currentValue instanceof Set) {
      return Array.from(currentValue.values());
    }

    if (typeof currentValue === 'function') {
      return `[Function ${currentValue.name || 'anonymous'}]`;
    }

    if (currentValue && typeof currentValue === 'object') {
      if (seen.has(currentValue)) {
        return '[Circular]';
      }

      seen.add(currentValue);
    }

    return currentValue;
  });
}

export default {
  safeJsonStringify
};
