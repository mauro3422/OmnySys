import {
  setupOrchestratorAPI as setupOrchestratorRoutes,
  setupBridgeAPI as setupBridgeRoutes,
  setupWebSocket as setupWsRoutes
} from './api-routes.js';

export function setupOrchestratorAPI() {
  return setupOrchestratorRoutes(this);
}

export function setupBridgeAPI() {
  return setupBridgeRoutes(this);
}

export function setupWebSocket() {
  return setupWsRoutes(this);
}
