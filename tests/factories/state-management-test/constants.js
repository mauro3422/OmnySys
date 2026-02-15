/**
 * @fileoverview State Management Test Factory - Constants
 */

export const StateManagementConstants = {
  REDUX_TYPES: {
    USE_SELECTOR: 'use_selector',
    USE_DISPATCH: 'use_dispatch',
    CONNECT_HOC: 'connect_hoc',
    MAP_STATE_FUNCTION: 'map_state_function',
    CREATE_SLICE: 'create_slice',
    STORE_CREATION: 'store_creation',
    ASYNC_THUNK: 'async_thunk',
    DISPATCH_CALL: 'dispatch_call'
  },

  CONTEXT_TYPES: {
    CONTEXT_CREATION: 'context_creation',
    CONTEXT_PROVIDER: 'context_provider',
    USE_CONTEXT: 'use_context',
    CONTEXT_CONSUMER: 'context_consumer',
    USE_CONTEXT_NEW: 'use_context_new'
  },

  CONNECTION_TYPES: {
    SHARED_SELECTOR: 'sharedSelector',
    CONTEXT_USAGE: 'contextUsage'
  },

  DEFAULT_CONFIDENCE: {
    SELECTOR: 0.9,
    CONTEXT: 0.95
  },

  SAMPLE_STATE_PATHS: [
    'state.user.name',
    'state.user.email',
    'state.user.id',
    'state.counter.value',
    'state.todos.items',
    'state.auth.token'
  ]
};

/**
 * Predefined test scenarios
 */

