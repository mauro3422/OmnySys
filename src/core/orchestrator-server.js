/**
 * @fileoverview orchestrator-server.js
 * 
 * 🔄 LEGACY WRAPPER - Maintained for backward compatibility
 * 
 * This file is a thin wrapper around the new modular structure.
 * New code should import from './orchestrator-server/index.js' directly.
 * 
 * @deprecated Use './orchestrator-server/index.js' instead
 * @module core/orchestrator-server
 */

import { OrchestratorServer, startOrchestratorServer } from './orchestrator-server/index.js';

// Re-export everything for backward compatibility
export { OrchestratorServer, startOrchestratorServer };
export default OrchestratorServer;

// Legacy default export
export { OrchestratorServer as default };
