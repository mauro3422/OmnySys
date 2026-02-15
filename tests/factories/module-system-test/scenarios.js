/**
 * @fileoverview Module System Test Factory - Scenarios
 */

import { DependencyBuilder, EntryPointBuilder, ModuleBuilder, ProjectBuilder } from './builders.js';

export const TestScenarios = {
  empty() {
    return ProjectBuilder.create().build();
  },

  singleModule() {
    return ProjectBuilder.create()
      .withSimpleModule('auth', { mainExport: 'authenticate', exportType: 'handler' })
      .build();
  },

  layeredArchitecture() {
    return ProjectBuilder.create()
      .withLayeredModules(['controllers', 'services', 'repositories', 'models'])
      .build();
  },

  apiWithRoutes() {
    return ProjectBuilder.create()
      .withApiModule('users', [
        { handler: 'getUsers', async: true },
        { handler: 'createUser', async: true, calls: [{ name: 'db.query', type: 'external' }] }
      ])
      .build();
  },

  withDependencies() {
    return ProjectBuilder.create()
      .withSimpleModule('auth')
      .withSimpleModule('users')
      .withConnectedModules([
        ['users', 'auth', ['validateToken', 'getUser']]
      ])
      .build();
  },

  eventDriven() {
    const authModule = ModuleBuilder.create('auth')
      .withMolecule('src/auth/events.js', [
        AtomBuilder.create('onUserLogin').exported().build(),
        AtomBuilder.create('handleEvent').exported().build()
      ]);
    
    const eventsModule = ModuleBuilder.create('events')
      .withFile('src/events/index.js');

    return ProjectBuilder.create()
      .withModule(authModule)
      .withModule(eventsModule)
      .build();
  },

  microservicesLike() {
    return ProjectBuilder.create()
      .withSimpleModule('user-service', { exportType: 'service' })
      .withSimpleModule('order-service', { exportType: 'service' })
      .withSimpleModule('payment-service', { exportType: 'service' })
      .build();
  }
};

// ============================================================================
// MOCK HELPERS
// ============================================================================


