import { describe, it, expect } from 'vitest';
import {
  EVENT_PATTERNS,
  ConnectionType,
  Severity,
  DEFAULT_BABEL_PLUGINS,
  DEFAULT_PARSER_OPTIONS,
  BUS_OWNER_PATTERNS,
  CRITICAL_EVENT_PATTERNS,
  MIN_CONFIDENCE_THRESHOLD,
  HIGH_SEVERITY_LISTENER_THRESHOLD
} from '#layer-a/analyses/tier3/event-detector/constants.js';

describe('analyses/tier3/event-detector/constants.js', () => {
  it('exports SSOT constants for event detection', () => {
    expect(EVENT_PATTERNS.listeners.length).toBeGreaterThan(0);
    expect(ConnectionType.EVENT_LISTENER).toBe('event_listener');
    expect(Severity.HIGH).toBe('high');
    expect(Array.isArray(DEFAULT_BABEL_PLUGINS)).toBe(true);
    expect(DEFAULT_PARSER_OPTIONS).toHaveProperty('sourceType', 'module');
    expect(BUS_OWNER_PATTERNS.length).toBeGreaterThan(0);
    expect(CRITICAL_EVENT_PATTERNS).toContain('auth');
    expect(MIN_CONFIDENCE_THRESHOLD).toBeGreaterThan(0);
    expect(HIGH_SEVERITY_LISTENER_THRESHOLD).toBeGreaterThan(0);
  });
});

