import { describe, it, expect, beforeEach } from 'vitest';
import { HistoryManager } from '#core/atomic-editor/history/history-manager.js';

describe('HistoryManager', () => {
  let history;
  const defaultMaxSize = 50;

  beforeEach(() => {
    history = new HistoryManager(defaultMaxSize);
  });

  describe('constructor', () => {
    it('initializes with empty history', () => {
      expect(history.history).toEqual([]);
      expect(history.historyIndex).toBe(-1);
    });

    it('sets max size', () => {
      expect(history.maxSize).toBe(defaultMaxSize);
    });

    it('accepts custom max size', () => {
      const customHistory = new HistoryManager(100);

      expect(customHistory.maxSize).toBe(100);
    });
  });

  describe('add()', () => {
    it('adds entry to history', () => {
      const operation = { type: 'modify', filePath: 'test.js' };
      const undoData = { content: 'original' };

      history.add(operation, undoData);

      expect(history.history.length).toBe(1);
      expect(history.history[0].operation).toBe(operation);
      expect(history.history[0].undoData).toBe(undoData);
    });

    it('increments history index', () => {
      history.add({ type: 'modify' }, {});

      expect(history.historyIndex).toBe(0);
    });

    it('adds timestamp to entry', () => {
      const before = Date.now();
      history.add({ type: 'modify' }, {});
      const after = Date.now();

      const entry = history.history[0];
      expect(entry.timestamp).toBeGreaterThanOrEqual(before);
      expect(entry.timestamp).toBeLessThanOrEqual(after);
    });

    it('removes redo entries when adding new operation', () => {
      history.add({ type: 'modify' }, {});
      history.add({ type: 'insert' }, {});
      history.moveBackward();

      expect(history.history.length).toBe(2);
      expect(history.historyIndex).toBe(0);

      history.add({ type: 'delete' }, {});

      expect(history.history.length).toBe(2);
      expect(history.historyIndex).toBe(1);
    });

    it('trims history when exceeding max size', () => {
      const smallHistory = new HistoryManager(3);

      smallHistory.add({ type: 'modify', id: 1 }, {});
      smallHistory.add({ type: 'modify', id: 2 }, {});
      smallHistory.add({ type: 'modify', id: 3 }, {});
      smallHistory.add({ type: 'modify', id: 4 }, {});

      expect(smallHistory.history.length).toBe(3);
      expect(smallHistory.history[0].operation.id).toBe(2);
    });

    it('adjusts index when trimming', () => {
      const smallHistory = new HistoryManager(3);

      smallHistory.add({ type: 'modify', id: 1 }, {});
      smallHistory.add({ type: 'modify', id: 2 }, {});
      smallHistory.add({ type: 'modify', id: 3 }, {});
      smallHistory.add({ type: 'modify', id: 4 }, {});

      expect(smallHistory.historyIndex).toBe(2);
    });
  });

  describe('getCurrentForUndo()', () => {
    it('returns null when history is empty', () => {
      expect(history.getCurrentForUndo()).toBeNull();
    });

    it('returns null when index is -1', () => {
      expect(history.getCurrentForUndo()).toBeNull();
    });

    it('returns current entry', () => {
      history.add({ type: 'modify' }, { content: 'data' });

      const entry = history.getCurrentForUndo();
      expect(entry).toBeDefined();
      expect(entry.operation.type).toBe('modify');
    });

    it('returns correct entry after multiple operations', () => {
      history.add({ type: 'modify', id: 1 }, {});
      history.add({ type: 'insert', id: 2 }, {});
      history.add({ type: 'delete', id: 3 }, {});

      const entry = history.getCurrentForUndo();
      expect(entry.operation.id).toBe(3);
    });

    it('returns correct entry after undo', () => {
      history.add({ type: 'modify', id: 1 }, {});
      history.add({ type: 'insert', id: 2 }, {});
      history.moveBackward();

      const entry = history.getCurrentForUndo();
      expect(entry.operation.id).toBe(1);
    });
  });

  describe('getCurrentForRedo()', () => {
    it('returns null when history is empty', () => {
      expect(history.getCurrentForRedo()).toBeNull();
    });

    it('returns null when at end of history', () => {
      history.add({ type: 'modify' }, {});

      expect(history.getCurrentForRedo()).toBeNull();
    });

    it('returns entry after undo', () => {
      history.add({ type: 'modify', id: 1 }, {});
      history.add({ type: 'insert', id: 2 }, {});
      history.moveBackward();

      const entry = history.getCurrentForRedo();
      expect(entry.operation.id).toBe(2);
    });

    it('returns null when all redos consumed', () => {
      history.add({ type: 'modify' }, {});
      history.moveBackward();
      history.moveForward();

      expect(history.getCurrentForRedo()).toBeNull();
    });
  });

  describe('moveBackward()', () => {
    it('does nothing when already at beginning', () => {
      history.moveBackward();
      expect(history.historyIndex).toBe(-1);
    });

    it('decrements index', () => {
      history.add({ type: 'modify' }, {});
      history.add({ type: 'insert' }, {});

      history.moveBackward();

      expect(history.historyIndex).toBe(0);
    });

    it('stops at -1', () => {
      history.add({ type: 'modify' }, {});
      history.moveBackward();
      history.moveBackward();
      history.moveBackward();

      expect(history.historyIndex).toBe(-1);
    });
  });

  describe('moveForward()', () => {
    it('does nothing when at end', () => {
      history.add({ type: 'modify' }, {});

      history.moveForward();

      expect(history.historyIndex).toBe(0);
    });

    it('increments index after undo', () => {
      history.add({ type: 'modify' }, {});
      history.add({ type: 'insert' }, {});
      history.moveBackward();
      history.moveBackward();

      history.moveForward();

      expect(history.historyIndex).toBe(0);
    });

    it('stops at last entry', () => {
      history.add({ type: 'modify' }, {});
      history.moveBackward();

      history.moveForward();
      history.moveForward();
      history.moveForward();

      expect(history.historyIndex).toBe(0);
    });
  });

  describe('canUndo()', () => {
    it('returns false when empty', () => {
      expect(history.canUndo()).toBe(false);
    });

    it('returns true when operations exist', () => {
      history.add({ type: 'modify' }, {});

      expect(history.canUndo()).toBe(true);
    });

    it('returns false after all undos', () => {
      history.add({ type: 'modify' }, {});
      history.moveBackward();

      expect(history.canUndo()).toBe(false);
    });
  });

  describe('canRedo()', () => {
    it('returns false when empty', () => {
      expect(history.canRedo()).toBe(false);
    });

    it('returns false when at end', () => {
      history.add({ type: 'modify' }, {});

      expect(history.canRedo()).toBe(false);
    });

    it('returns true after undo', () => {
      history.add({ type: 'modify' }, {});
      history.moveBackward();

      expect(history.canRedo()).toBe(true);
    });
  });
});
