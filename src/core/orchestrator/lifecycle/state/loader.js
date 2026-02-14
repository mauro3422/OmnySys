/**
 * Load persisted orchestrator state
 */
export async function _loadState() {
  try {
    const state = await this.stateManager.read();
    if (state.queue) {
      // Restore queue if needed
    }
  } catch {
    // No previous state
  }
}
