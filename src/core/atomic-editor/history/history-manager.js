export class HistoryManager {
  constructor(maxSize = 50) {
    this.history = [];
    this.historyIndex = -1;
    this.maxSize = maxSize;
  }

  add(operation, undoData) {
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push({ operation, undoData, timestamp: Date.now() });
    this.historyIndex++;

    if (this.history.length > this.maxSize) {
      this.history.shift();
      this.historyIndex--;
    }
  }

  getCurrentForUndo() {
    if (this.historyIndex < 0) return null;
    return this.history[this.historyIndex];
  }

  getCurrentForRedo() {
    if (this.historyIndex >= this.history.length - 1) return null;
    return this.history[this.historyIndex + 1];
  }

  moveBackward() {
    if (this.historyIndex >= 0) this.historyIndex--;
  }

  moveForward() {
    if (this.historyIndex < this.history.length - 1) this.historyIndex++;
  }

  canUndo() {
    return this.historyIndex >= 0;
  }

  canRedo() {
    return this.historyIndex < this.history.length - 1;
  }

  getInfo() {
    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      count: this.history.length,
      currentIndex: this.historyIndex
    };
  }

  resetUndoRedoState() {
    this.history = [];
    this.historyIndex = -1;
  }

  getHistorySnapshot() {
    return [...this.history];
  }
}
