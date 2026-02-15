/**
 * @fileoverview Query Test Factory - Constants
 */

/**
 * Test data constants
 */
export const QueryTestConstants = {
  TEST_PROJECT_ROOT: '/test/project',
  VALID_FILE_PATHS: [
    'src/index.js',
    'src/utils.js',
    'src/components/Button.js',
    'lib/helpers.ts'
  ],
  INVALID_FILE_PATHS: [
    '',
    null,
    undefined,
    123
  ],
  ARCHETYPE_TYPES: [
    'dead-function',
    'hot-path',
    'fragile-network',
    'stateful',
    'pure-function',
    'side-effect'
  ],
  CONNECTION_TYPES: [
    'shared-state',
    'event-listener',
    'callback',
    'promise-chain'
  ],
  SEVERITY_LEVELS: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
};


