#!/usr/bin/env node

/**
 * @fileoverview omny.js
 * 
 * 🔄 LEGACY WRAPPER - Maintained for backward compatibility
 * 
 * This file is a thin wrapper around the new modular structure in src/cli/.
 * New code should import from './src/cli/index.js' directly.
 * 
 * The main implementation has been moved to src/cli/ for better organization:
 * - src/cli/commands/ - Individual command implementations
 * - src/cli/utils/ - Shared utilities
 * - src/cli/handlers/ - Process management
 * 
 * @deprecated Use './src/cli/index.js' instead
 * @module omny
 */

import { main } from './src/cli/index.js';

await main();
