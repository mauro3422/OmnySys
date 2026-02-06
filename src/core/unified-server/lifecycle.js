export async function shutdown() {
  console.log('\nðŸ‘‹ Shutting down Unified Server...');

  this.isRunning = false;

  if (this.wsManager) {
    await this.wsManager.stop();
  }

  if (this.batchProcessor) {
    this.batchProcessor.stop();
  }

  if (this.fileWatcher) {
    await this.fileWatcher.stop();
  }

  if (this.worker) {
    await this.worker.stop();
  }

  if (this.orchestratorServer) {
    this.orchestratorServer.close();
  }

  if (this.bridgeServer) {
    this.bridgeServer.close();
  }

  console.log('âœ… Server stopped');
  process.exit(0);
}
