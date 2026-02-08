/**
 * @fileoverview temporal-patterns.js
 *
 * Temporal Patterns Extractor - Lifecycle hooks, events, timers
 * Part of the metadata extraction pipeline
 *
 * @module extractors/metadata/temporal-patterns
 */

import { getLineNumber } from '../utils.js';

/**
 * Extracts temporal patterns from code
 * @param {string} code - Source code to analyze
 * @returns {Object} Temporal pattern information
 */
export function extractTemporalPatterns(code) {
  const lifecycleHooks = [];
  const eventHandlers = [];
  const timers = [];
  const cleanupPatterns = [];

  // Extract React/Vue/Angular/Svelte/SolidJS lifecycle hooks
  const lifecyclePatterns = [
    // React hooks
    { pattern: /useEffect\s*\(/g, hook: 'useEffect', framework: 'React' },
    { pattern: /useLayoutEffect\s*\(/g, hook: 'useLayoutEffect', framework: 'React' },
    { pattern: /componentDidMount\s*\(/g, hook: 'componentDidMount', framework: 'React' },
    { pattern: /componentWillUnmount\s*\(/g, hook: 'componentWillUnmount', framework: 'React' },
    { pattern: /componentDidUpdate\s*\(/g, hook: 'componentDidUpdate', framework: 'React' },
    // Vue lifecycle
    { pattern: /onMounted\s*\(/g, hook: 'onMounted', framework: 'Vue' },
    { pattern: /onUnmounted\s*\(/g, hook: 'onUnmounted', framework: 'Vue' },
    { pattern: /onBeforeMount\s*\(/g, hook: 'onBeforeMount', framework: 'Vue' },
    { pattern: /onBeforeUnmount\s*\(/g, hook: 'onBeforeUnmount', framework: 'Vue' },
    { pattern: /onUpdated\s*\(/g, hook: 'onUpdated', framework: 'Vue' },
    // Angular lifecycle
    { pattern: /ngOnInit\s*\(/g, hook: 'ngOnInit', framework: 'Angular' },
    { pattern: /ngOnDestroy\s*\(/g, hook: 'ngOnDestroy', framework: 'Angular' },
    { pattern: /ngAfterViewInit\s*\(/g, hook: 'ngAfterViewInit', framework: 'Angular' },
    { pattern: /ngOnChanges\s*\(/g, hook: 'ngOnChanges', framework: 'Angular' },
    // Svelte lifecycle
    { pattern: /onMount\s*\(/g, hook: 'onMount', framework: 'Svelte' },
    { pattern: /onDestroy\s*\(/g, hook: 'onDestroy', framework: 'Svelte' },
    { pattern: /beforeUpdate\s*\(/g, hook: 'beforeUpdate', framework: 'Svelte' },
    { pattern: /afterUpdate\s*\(/g, hook: 'afterUpdate', framework: 'Svelte' },
    // SolidJS lifecycle
    { pattern: /createEffect\s*\(/g, hook: 'createEffect', framework: 'SolidJS' },
    { pattern: /createMemo\s*\(/g, hook: 'createMemo', framework: 'SolidJS' },
    { pattern: /onCleanup\s*\(/g, hook: 'onCleanup', framework: 'SolidJS' }
  ];

  for (const { pattern, hook, framework } of lifecyclePatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      lifecycleHooks.push({
        hook,
        framework,
        line: getLineNumber(code, match.index)
      });
    }
  }

  // Extract event handlers
  const eventPatterns = [
    // addEventListener
    { pattern: /addEventListener\s*\(\s*['"](\w+)['"]/g, type: 'addEventListener' },
    // React synthetic events
    { pattern: /on(\w+)\s*=\s*\{/g, type: 'react-synthetic' },
    // jQuery events
    { pattern: /\$\([^)]+\)\.(on|click|change|submit|keypress|keydown|keyup)\s*\(/g, type: 'jquery' }
  ];

  for (const { pattern, type } of eventPatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      eventHandlers.push({
        event: match[1] || type,
        type,
        line: getLineNumber(code, match.index)
      });
    }
  }

  // Extract timers
  const timerPatterns = [
    { pattern: /setTimeout\s*\(/g, type: 'setTimeout' },
    { pattern: /setInterval\s*\(/g, type: 'setInterval' },
    { pattern: /requestAnimationFrame\s*\(/g, type: 'requestAnimationFrame' },
    { pattern: /requestIdleCallback\s*\(/g, type: 'requestIdleCallback' }
  ];

  for (const { pattern, type } of timerPatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      timers.push({
        type,
        line: getLineNumber(code, match.index)
      });
    }
  }

  // Extract cleanup patterns
  const cleanupPatterns_temp = [
    // removeEventListener
    { pattern: /removeEventListener\s*\(/g, type: 'removeEventListener' },
    // clearTimeout/clearInterval
    { pattern: /clearTimeout\s*\(/g, type: 'clearTimeout' },
    { pattern: /clearInterval\s*\(/g, type: 'clearInterval' },
    // useEffect cleanup (return function)
    { pattern: /return\s+\(\)\s*=>\s*\{/g, type: 'useEffect-cleanup' },
    // AbortController
    { pattern: /\.abort\s*\(/g, type: 'abort' }
  ];

  for (const { pattern, type } of cleanupPatterns_temp) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      cleanupPatterns.push({
        type,
        line: getLineNumber(code, match.index)
      });
    }
  }

  // Combine all
  const all = [
    ...lifecycleHooks.map(h => ({ ...h, category: 'lifecycle' })),
    ...eventHandlers.map(e => ({ ...e, category: 'event' })),
    ...timers.map(t => ({ ...t, category: 'timer' })),
    ...cleanupPatterns.map(c => ({ ...c, category: 'cleanup' }))
  ];

  return {
    lifecycleHooks,
    eventHandlers,
    timers,
    cleanupPatterns,
    all
  };
}
