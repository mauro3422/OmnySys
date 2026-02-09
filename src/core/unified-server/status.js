import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:status');


﻿export function printStatus() {
  logger.info('â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”');
  logger.info('âœ… OmnySys Unified Server Ready');
  logger.info('â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n');

  logger.info('ðŸŒ HTTP Endpoints:');
  logger.info(`   Orchestrator: http://localhost:${this.ports.orchestrator}`);
  logger.info(`   VS Code Bridge: http://localhost:${this.ports.bridge}\n`);

  logger.info('ðŸ“¡ Available Endpoints:');
  logger.info('   POST /command          - Queue file for analysis');
  logger.info('   GET  /status           - Queue status');
  logger.info('   GET  /health           - Health check');
  logger.info('   GET  /api/status       - Full system status');
  logger.info('   GET  /api/files        - List all files');
  logger.info('   GET  /api/impact/*     - Get impact map');
  logger.info('   POST /api/analyze      - Trigger analysis\n');

  logger.info('ðŸ”§ MCP Tools (for Claude):');
  logger.info('   â€¢ get_impact_map(filePath)');
  logger.info('   â€¢ analyze_change(filePath, symbolName)');
  logger.info('   â€¢ explain_connection(fileA, fileB)');
  logger.info('   â€¢ get_risk_assessment(minSeverity)');
  logger.info('   â€¢ search_files(pattern)\n');

  logger.info('ðŸ’¡ Press Ctrl+C to stop\n');
}
