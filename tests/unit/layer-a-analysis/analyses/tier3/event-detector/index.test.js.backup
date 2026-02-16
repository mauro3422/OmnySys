import { describe, it, expect } from 'vitest';
import EventDetectorDefault, {
  EVENT_PATTERNS,
  ConnectionType,
  Severity,
  getBabelPlugins,
  parseCodeToAST,
  isParseableFile,
  detectEventPatterns,
  detectListeners,
  detectEmitters,
  indexEventsByName,
  getEventStats,
  analyzeEventPatterns
} from '#layer-a/analyses/tier3/event-detector/index.js';

describe('analyses/tier3/event-detector/index.js', () => {
  it('exports stable facade contracts', () => {
    expect(EVENT_PATTERNS.listeners).toBeTypeOf('object');
    expect(ConnectionType.EVENT_LISTENER).toBe('event_listener');
    expect(Severity.HIGH).toBe('high');
    expect(getBabelPlugins).toBeTypeOf('function');
    expect(parseCodeToAST).toBeTypeOf('function');
    expect(isParseableFile).toBeTypeOf('function');
    expect(detectEventPatterns).toBeTypeOf('function');
    expect(analyzeEventPatterns).toBeTypeOf('function');
    expect(EventDetectorDefault).toHaveProperty('detectEventPatterns');
  });

  it('parses supported files and detects listener/emitter patterns', () => {
    const code = `
      const bus = createBus();
      bus.on('user.created', () => {});
      bus.emit('user.created', { id: 1 });
    `;
    const detected = detectEventPatterns(code, 'src/events.js');

    expect(isParseableFile('src/events.js')).toBe(true);
    expect(getBabelPlugins('src/events.ts').length).toBeGreaterThan(0);
    expect(detected.eventListeners.length).toBeGreaterThan(0);
    expect(detected.eventEmitters.length).toBeGreaterThan(0);
    expect(detectListeners(code, 'src/events.js').length).toBeGreaterThan(0);
    expect(detectEmitters(code, 'src/events.js').length).toBeGreaterThan(0);
  });

  it('analyzeEventPatterns builds cross-file connections contract', () => {
    const fileSourceCode = {
      'src/emitter.js': `const bus = createBus(); bus.emit('account.updated', {});`,
      'src/listener.js': `const bus = createBus(); bus.on('account.updated', () => {});`
    };

    const result = analyzeEventPatterns(fileSourceCode);
    const index = indexEventsByName(result.fileResults);
    const stats = getEventStats(index);

    expect(result).toHaveProperty('connections');
    expect(result).toHaveProperty('fileResults');
    expect(Array.isArray(result.connections)).toBe(true);
    expect(stats.totalEvents).toBeGreaterThan(0);
    expect(stats.totalListeners).toBeGreaterThan(0);
    expect(stats.totalEmitters).toBeGreaterThan(0);
  });
});
