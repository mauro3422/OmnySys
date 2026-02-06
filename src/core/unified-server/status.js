export function printStatus() {
  console.log('â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”');
  console.log('âœ… CogniSystem Unified Server Ready');
  console.log('â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n');

  console.log('ðŸŒ HTTP Endpoints:');
  console.log(`   Orchestrator: http://localhost:${this.ports.orchestrator}`);
  console.log(`   VS Code Bridge: http://localhost:${this.ports.bridge}\n`);

  console.log('ðŸ“¡ Available Endpoints:');
  console.log('   POST /command          - Queue file for analysis');
  console.log('   GET  /status           - Queue status');
  console.log('   GET  /health           - Health check');
  console.log('   GET  /api/status       - Full system status');
  console.log('   GET  /api/files        - List all files');
  console.log('   GET  /api/impact/*     - Get impact map');
  console.log('   POST /api/analyze      - Trigger analysis\n');

  console.log('ðŸ”§ MCP Tools (for Claude):');
  console.log('   â€¢ get_impact_map(filePath)');
  console.log('   â€¢ analyze_change(filePath, symbolName)');
  console.log('   â€¢ explain_connection(fileA, fileB)');
  console.log('   â€¢ get_risk_assessment(minSeverity)');
  console.log('   â€¢ search_files(pattern)\n');

  console.log('ðŸ’¡ Press Ctrl+C to stop\n');
}
