/**
 * @fileoverview Shutdown helpers
 *
 * Shared helpers for graceful shutdown/cleanup flows.
 */

export async function closeIfPresent(target, methodName = 'close') {
  const method = target?.[methodName];
  if (typeof method !== 'function') {
    return false;
  }

  if (method.length > 0) {
    await new Promise((resolve, reject) => {
      let settled = false;
      const done = (error) => {
        if (settled) return;
        settled = true;
        if (error) {
          reject(error);
          return;
        }
        resolve(true);
      };

      try {
        const result = method.call(target, done);
        if (result && typeof result.then === 'function') {
          result.then(() => done(), reject);
        }
      } catch (error) {
        reject(error);
      }
    });
  } else {
    await method.call(target);
  }

  return true;
}

export async function stopIfPresent(target) {
  return closeIfPresent(target, 'stop');
}

export async function shutdownTargets(targets = []) {
  for (const target of targets) {
    await closeIfPresent(target.target, target.methodName || 'close');
  }
}
