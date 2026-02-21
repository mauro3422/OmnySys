/**
 * @fileoverview Tests for json-cleaners.js
 * Pure functions — no mocks needed.
 */

import { describe, it, expect } from 'vitest';
import {
  removeMarkdownBlocks,
  removeComments,
  removeTrailingCommas,
  normalizeQuotes,
  extractJSON
} from '#ai/llm/json-cleaners.js';

// ── removeMarkdownBlocks ──────────────────────────────────────────────────────

describe('removeMarkdownBlocks', () => {
  it('removes ```json opening block', () => {
    const result = removeMarkdownBlocks('```json\n{"key": "value"}\n```');
    expect(result).toContain('"key": "value"');
    expect(result).not.toContain('```json');
    expect(result).not.toContain('```');
  });

  it('removes ``` closing block', () => {
    const result = removeMarkdownBlocks('some text\n```');
    expect(result).not.toContain('```');
  });

  it('removes all backtick blocks', () => {
    const result = removeMarkdownBlocks('```\n{"a":1}\n```');
    expect(result).not.toContain('`');
  });

  it('is case-insensitive for ```JSON', () => {
    const result = removeMarkdownBlocks('```JSON\n{"key": 1}\n```');
    expect(result).not.toContain('```JSON');
  });

  it('returns unchanged text with no markdown blocks', () => {
    const input = '{"key": "value"}';
    expect(removeMarkdownBlocks(input)).toBe(input);
  });

  it('handles empty string', () => {
    expect(removeMarkdownBlocks('')).toBe('');
  });
});

// ── removeComments ────────────────────────────────────────────────────────────

describe('removeComments', () => {
  it('removes single-line comments', () => {
    const result = removeComments('{"a": 1} // comment here');
    expect(result).toContain('"a": 1');
    expect(result).not.toContain('// comment here');
  });

  it('removes multi-line block comments', () => {
    const result = removeComments('{"a": /* block comment */ 1}');
    expect(result).toContain('"a":');
    expect(result).not.toContain('block comment');
  });

  it('removes multiple single-line comments', () => {
    const input = '{"a": 1}\n// line 1\n{"b": 2}\n// line 2';
    const result = removeComments(input);
    expect(result).not.toContain('// line 1');
    expect(result).not.toContain('// line 2');
  });

  it('handles empty string', () => {
    expect(removeComments('')).toBe('');
  });

  it('returns unchanged text with no comments', () => {
    const input = '{"key": "value"}';
    const result = removeComments(input);
    expect(result).toContain('"key": "value"');
  });
});

// ── removeTrailingCommas ──────────────────────────────────────────────────────

describe('removeTrailingCommas', () => {
  it('removes trailing comma before }', () => {
    const result = removeTrailingCommas('{"a": 1,}');
    expect(result).toBe('{"a": 1}');
  });

  it('removes trailing comma before ]', () => {
    const result = removeTrailingCommas('[1, 2, 3,]');
    expect(result).toBe('[1, 2, 3]');
  });

  it('removes multiple trailing commas', () => {
    const input = '{"a": 1,, "b": [1,2,]}';
    const result = removeTrailingCommas(input);
    expect(result).not.toMatch(/,\s*[}\]]/);
  });

  it('preserves non-trailing commas', () => {
    const input = '{"a": 1, "b": 2}';
    const result = removeTrailingCommas(input);
    expect(result).toBe('{"a": 1, "b": 2}');
  });

  it('handles empty string', () => {
    expect(removeTrailingCommas('')).toBe('');
  });
});

// ── normalizeQuotes ───────────────────────────────────────────────────────────

describe('normalizeQuotes', () => {
  it('converts single quotes outside strings to double quotes', () => {
    const result = normalizeQuotes("{'key': 'value'}");
    expect(result).toBe('{"key": "value"}');
  });

  it('preserves existing double-quoted strings', () => {
    const input = '{"key": "value with \'apostrophe\'"}';
    const result = normalizeQuotes(input);
    // The outer double-quoted string content should remain intact
    expect(result).toContain('"key"');
  });

  it('handles empty string', () => {
    expect(normalizeQuotes('')).toBe('');
  });

  it('handles string with only double quotes (no change)', () => {
    const input = '{"a": "b"}';
    const result = normalizeQuotes(input);
    expect(result).toBe(input);
  });
});

// ── extractJSON ───────────────────────────────────────────────────────────────

describe('extractJSON', () => {
  it('extracts simple object from clean input', () => {
    const result = extractJSON('{"name": "test", "value": 123}');
    expect(result).toBe('{"name": "test", "value": 123}');
  });

  it('extracts object from text with prefix', () => {
    const result = extractJSON('Here is the JSON: {"key": "val"}');
    expect(result).toContain('"key": "val"');
    expect(result.trim()).toMatch(/^\{/);
  });

  it('extracts object from text with suffix', () => {
    const result = extractJSON('{"key": "val"} and some trailing text');
    expect(result.trim()).toBe('{"key": "val"}');
  });

  it('extracts JSON array', () => {
    const result = extractJSON('[1, 2, 3]');
    expect(result.trim()).toBe('[1, 2, 3]');
  });

  it('extracts array from text with prefix', () => {
    const result = extractJSON('Result: [1, 2, 3] done');
    expect(result.trim()).toBe('[1, 2, 3]');
  });

  it('handles nested objects', () => {
    const input = '{"outer": {"inner": "value"}}';
    const result = extractJSON(input);
    expect(result).toBe(input);
  });

  it('handles nested arrays', () => {
    const input = '[[1, 2], [3, 4]]';
    const result = extractJSON(input);
    expect(result).toBe(input);
  });

  it('handles strings containing braces inside JSON', () => {
    const input = '{"code": "function(){return {}}"}';
    const result = extractJSON(input);
    // Should not cut off at the first inner }
    expect(result).toBe(input);
  });

  it('handles escaped quotes inside strings', () => {
    const input = '{"msg": "say \\"hello\\""}';
    const result = extractJSON(input);
    expect(result).toBe(input);
  });

  it('picks { over [ when { comes first', () => {
    const input = '{"a": [1,2]}';
    const result = extractJSON(input);
    expect(result.trim()).toMatch(/^\{/);
  });

  it('picks [ over { when [ comes first', () => {
    const input = '[{"a": 1}]';
    const result = extractJSON(input);
    expect(result.trim()).toMatch(/^\[/);
  });

  it('handles whitespace-only prefix', () => {
    const input = '   {"key": "val"}   ';
    const result = extractJSON(input);
    expect(result.trim()).toBe('{"key": "val"}');
  });

  it('returns trimmed input when no JSON delimiters found', () => {
    const result = extractJSON('no json here');
    expect(result).toBe('no json here');
  });

  it('handles empty string gracefully', () => {
    const result = extractJSON('');
    expect(result).toBe('');
  });
});
