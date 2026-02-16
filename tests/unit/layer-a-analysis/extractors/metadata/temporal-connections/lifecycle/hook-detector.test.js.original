import { describe, it, expect } from 'vitest';
import {
  detectLifecycleHooks,
  groupHooksByPhase
} from '#layer-a/extractors/metadata/temporal-connections/lifecycle/hook-detector.js';

describe('extractors/metadata/temporal-connections/lifecycle/hook-detector.js', () => {
  it('detects framework hooks and cleanup markers', () => {
    const code = `
      useEffect(() => {
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
      }, []);
    `;
    const hooks = detectLifecycleHooks(code);
    expect(hooks.length).toBeGreaterThan(0);
    expect(hooks.some(h => h.type === 'useEffect')).toBe(true);
  });

  it('groups detected hooks by phase', () => {
    const grouped = groupHooksByPhase([
      { type: 'useEffect', phase: 'render' },
      { type: 'componentDidMount', phase: 'mount' }
    ]);
    expect(grouped).toHaveProperty('render');
    expect(grouped).toHaveProperty('mount');
  });
});

