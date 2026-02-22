/**
 * @fileoverview Static Extractor Test Factory - Scenarios
 */

import {
  EnvBuilder,
  EventBuilder,
  GlobalBuilder,
  RouteBuilder,
  StorageBuilder
} from './builders/index.js';

export const StaticScenarios = {
  /**
   * Empty file
   */
  emptyFile() {
    return { code: '', routes: { server: [], client: [], all: [] }, envVars: [], events: { listeners: [], emitters: [], all: [] }, storage: { reads: [], writes: [], all: [] }, globals: { reads: [], writes: [], all: [] } };
  },

  /**
   * Simple route
   */
  simpleRoute() {
    const builder = new RouteBuilder();
    builder.withServerRoute('get', '/api/test');
    return builder.build();
  },

  /**
   * Simple env var
   */
  simpleEnv() {
    const builder = new EnvBuilder();
    builder.withProcessEnv('TEST_VAR');
    return builder.build();
  },

  /**
   * Simple event
   */
  simpleEvent() {
    const builder = new EventBuilder();
    builder.withEventListener('click', 'handleClick');
    return builder.build();
  },

  /**
   * Simple storage
   */
  simpleStorage() {
    const builder = new StorageBuilder();
    builder.withLocalStorageWrite('key', '"value"');
    return builder.build();
  },

  /**
   * Simple global
   */
  simpleGlobal() {
    const builder = new GlobalBuilder();
    builder.withWindowWrite('testProp', '123');
    return builder.build();
  },

  /**
   * Complex API routes
   */
  complexRoutes() {
    const builder = new RouteBuilder();
    builder.withExpressApp();
    return builder.build();
  },

  /**
   * Complex env setup
   */
  complexEnv() {
    const builder = new EnvBuilder();
    builder.withConfigObject();
    return builder.build();
  },

  /**
   * Complex events
   */
  complexEvents() {
    const builder = new EventBuilder();
    builder.withEventBus();
    return builder.build();
  },

  /**
   * Complex storage
   */
  complexStorage() {
    const builder = new StorageBuilder();
    builder.withAuthStorage().withSettingsStorage();
    return builder.build();
  },

  /**
   * Complex globals
   */
  complexGlobals() {
    const builder = new GlobalBuilder();
    builder.withAppStateGlobal().withFeatureFlagsGlobal();
    return builder.build();
  }
};

/**
 * Validation helpers for static extractor results
 */
