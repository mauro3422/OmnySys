/**
 * Monitor indexing progress and emit events
 */
export function _monitorIndexingProgress() {
  const checkProgress = () => {
    if (!this.isIndexing) return;

    this.emit('indexing:progress', this.indexingProgress);
    setTimeout(checkProgress, 1000);
  };

  checkProgress();
}
