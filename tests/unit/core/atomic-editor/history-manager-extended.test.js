import { describe, it, expect, beforeEach } from 'vitest';
import { HistoryManager } from '#core/atomic-editor/history/history-manager.js';
import { HistoryEntryBuilder } from '#test-factories/core-atomic-editor';

describe('HistoryManager extended behaviors', () => {
  let history;
  const defaultMaxSize = 50;

  beforeEach(() => {
    history = new HistoryManager(defaultMaxSize);
  });

  describe('getInfo()', () => {
    it('returns correct info for empty history', () => {
      const info = history.getInfo();

      expect(info.canUndo).toBe(false);
      expect(info.canRedo).toBe(false);
      expect(info.count).toBe(0);
      expect(info.currentIndex).toBe(-1);
    });

    it('returns correct info with operations', () => {
      history.add({ type: 'modify' }, {});
      history.add({ type: 'insert' }, {});

      const info = history.getInfo();

      expect(info.canUndo).toBe(true);
      expect(info.canRedo).toBe(false);
      expect(info.count).toBe(2);
      expect(info.currentIndex).toBe(1);
    });

    it('returns correct info after undo', () => {
      history.add({ type: 'modify' }, {});
      history.moveBackward();

      const info = history.getInfo();

      expect(info.canUndo).toBe(false);
      expect(info.canRedo).toBe(true);
      expect(info.currentIndex).toBe(-1);
    });
  });

  describe('resetUndoRedoState()', () => {
    it('empties history', () => {
      history.add({ type: 'modify' }, {});
      history.add({ type: 'insert' }, {});
      history.resetUndoRedoState();
      expect(history.history).toEqual([]);
      expect(history.historyIndex).toBe(-1);
    });

    it('resets index', () => {
      history.add({ type: 'modify' }, {});
      history.add({ type: 'insert' }, {});
      history.moveBackward();
      history.resetUndoRedoState();
      expect(history.historyIndex).toBe(-1);
    });
  });

  describe('getHistorySnapshot()', () => {
    it('returns empty array when no history', () => {
      expect(history.getHistorySnapshot()).toEqual([]);
    });

    it('returns copy of history', () => {
      history.add({ type: 'modify' }, {});

      const all = history.getHistorySnapshot();

      expect(all).not.toBe(history.history);
      expect(all.length).toBe(1);
    });

    it('returns all entries', () => {
      history.add({ type: 'modify', id: 1 }, {});
      history.add({ type: 'insert', id: 2 }, {});
      history.add({ type: 'delete', id: 3 }, {});

      const all = history.getHistorySnapshot();

      expect(all.length).toBe(3);
      expect(all[0].operation.id).toBe(1);
      expect(all[2].operation.id).toBe(3);
    });
  });

  describe('HistoryEntryBuilder integration', () => {
    it('builder creates modify entry', () => {
      const entry = HistoryEntryBuilder.create()
        .asModifyOperation()
        .withUndoData({ content: 'original' })
        .build();

      expect(entry.operation.type).toBe('modify');
      expect(entry.canUndo).toBe(true);
    });

    it('builder creates insert entry', () => {
      const entry = HistoryEntryBuilder.create()
        .asInsertOperation()
        .canRedo(true)
        .build();

      expect(entry.operation.type).toBe('insert');
      expect(entry.canRedo).toBe(true);
    });

    it('builder creates entry with timestamp', () => {
      const entry = HistoryEntryBuilder.create()
        .withOldTimestamp()
        .build();

      expect(entry.timestamp).toBeLessThan(Date.now());
      expect(entry.timestamp).toBeGreaterThan(0);
    });
  });

  describe('complex undo/redo scenarios', () => {
    it('handles multiple undo/redo cycles', () => {
      history.add({ type: 'modify', id: 1 }, {});
      history.add({ type: 'insert', id: 2 }, {});
      history.add({ type: 'delete', id: 3 }, {});

      history.moveBackward();
      expect(history.getCurrentForUndo().operation.id).toBe(2);

      history.moveBackward();
      expect(history.getCurrentForUndo().operation.id).toBe(1);

      history.moveForward();
      expect(history.getCurrentForUndo().operation.id).toBe(2);

      history.moveForward();
      expect(history.getCurrentForUndo().operation.id).toBe(3);
    });

    it('clears redo stack on new operation', () => {
      history.add({ type: 'modify', id: 1 }, {});
      history.add({ type: 'insert', id: 2 }, {});
      history.moveBackward();

      expect(history.canRedo()).toBe(true);

      history.add({ type: 'delete', id: 3 }, {});

      expect(history.canRedo()).toBe(false);
      expect(history.history.length).toBe(2);
    });
  });
});
