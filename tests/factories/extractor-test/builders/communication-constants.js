/**
 * @fileoverview Communication Constants - Constantes para escenarios de comunicación
 */

export const CommunicationConstants = {
  COMMUNICATION_TYPES: {
    WEBSOCKET: 'websocket_url',
    WEBSOCKET_EVENT: 'websocket_event',
    NETWORK_FETCH: 'network_fetch',
    NETWORK_XHR: 'network_xhr',
    NETWORK_AXIOS: 'network_axios',
    WORKER_CREATION: 'worker_creation',
    WORKER_POSTMESSAGE: 'worker_postMessage',
    WORKER_ONMESSAGE: 'worker_onmessage',
    SHAREDWORKER_CREATION: 'sharedworker_creation',
    BROADCAST_CHANNEL: 'broadcastChannel',
    MESSAGECHANNEL_CREATION: 'messageChannel_creation',
    MESSAGECHANNEL_PORT: 'messageChannel_port_usage',
    EVENTSOURCE_URL: 'eventsource_url',
    EVENTSOURCE_EVENT: 'eventsource_event',
    WINDOW_POSTMESSAGE_OUTGOING: 'window_postmessage_outgoing',
    WINDOW_POSTMESSAGE_LISTENER: 'window_postmessage_listener',
    WINDOW_ONMESSAGE: 'window_onmessage'
  },

  WEBSOCKET_EVENTS: ['onopen', 'onmessage', 'onclose', 'onerror'],

  NETWORK_METHODS: {
    FETCH: 'fetch',
    XHR: 'xhr',
    AXIOS: 'axios'
  },

  HTTP_METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],

  WORKER_TYPES: {
    DEDICATED: 'Worker',
    SHARED: 'SharedWorker'
  }
};

export const CommunicationExtractorContracts = {
  REQUIRED_WEBSOCKET_FIELDS: ['urls', 'events', 'all'],
  REQUIRED_NETWORK_FIELDS: ['urls', 'all'],
  REQUIRED_WORKER_FIELDS: ['incoming', 'outgoing', 'all'],
  REQUIRED_SHARED_WORKER_FIELDS: ['workers', 'all'],
  REQUIRED_BROADCAST_CHANNEL_FIELDS: ['channels', 'all'],
  REQUIRED_MESSAGE_CHANNEL_FIELDS: ['channels', 'all'],
  REQUIRED_SSE_FIELDS: ['urls', 'events', 'all'],
  REQUIRED_POSTMESSAGE_FIELDS: ['outgoing', 'incoming', 'all'],

  // All items in 'all' array must have these fields
  REQUIRED_ITEM_FIELDS: ['type', 'line'],

  // Specific fields for different types
  URL_FIELDS: ['url', 'line', 'type'],
  EVENT_FIELDS: ['event', 'line', 'type'],
  WORKER_FIELDS: ['workerPath', 'line', 'type'],
  CHANNEL_FIELDS: ['channel', 'line', 'type']
};
