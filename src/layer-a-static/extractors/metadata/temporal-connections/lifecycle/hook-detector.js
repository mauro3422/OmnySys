/**
 * @fileoverview Lifecycle Hook Detector
 * 
 * Detects React, Vue, and other framework lifecycle hooks.
 * 
 * @module temporal-connections/lifecycle
 */

const REACT_HOOKS = [
  { pattern: /useEffect\s*\(/, name: 'useEffect', phase: 'render' },
  { pattern: /useLayoutEffect\s*\(/, name: 'useLayoutEffect', phase: 'layout' },
  { pattern: /useMemo\s*\(/, name: 'useMemo', phase: 'render' },
  { pattern: /useCallback\s*\(/, name: 'useCallback', phase: 'render' },
  { pattern: /useInsertionEffect\s*\(/, name: 'useInsertionEffect', phase: 'insertion' },
  { pattern: /componentDidMount/, name: 'componentDidMount', phase: 'mount' },
  { pattern: /componentWillMount/, name: 'componentWillMount', phase: 'pre-mount' },
  { pattern: /componentWillUnmount/, name: 'componentWillUnmount', phase: 'unmount' }
];

/**
 * Detects lifecycle hooks (React, Vue, etc.)
 * @param {string} code - Source code
 * @returns {Array} Detected lifecycle hooks
 */
export function detectLifecycleHooks(code) {
  const hooks = [];
  
  for (const hook of REACT_HOOKS) {
    if (hook.pattern.test(code)) {
      const hookCode = code.split(hook.name)[1]?.split('}')[0] || '';
      const depsMatch = code.match(new RegExp(`${hook.name}\\s*\\([^,]*\\,\\s*(\\[[^\\]]*\\])`));
      
      hooks.push({
        type: hook.name,
        phase: hook.phase,
        dependencies: depsMatch ? depsMatch[1] : 'unknown',
        hasCleanup: /return\s*function|return\s*\(\)/.test(hookCode)
      });
    }
  }
  
  return hooks;
}

/**
 * Groups hooks by phase
 * @param {Array} hooks - Hooks to group
 * @returns {Object} Hooks grouped by phase
 */
export function groupHooksByPhase(hooks) {
  return hooks.reduce((acc, hook) => {
    if (!acc[hook.phase]) acc[hook.phase] = [];
    acc[hook.phase].push(hook);
    return acc;
  }, {});
}
