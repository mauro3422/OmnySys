/**
 * @fileoverview Routes Index
 * 
 * Aggregates all route handlers
 * 
 * @module orchestrator-server/routes
 */

export { handleCommand } from './command-route.js';
export { handleStatus } from './status-route.js';
export { handleHealth } from './health-route.js';
export { handleQueue } from './queue-route.js';
export { handleRestart } from './restart-route.js';
