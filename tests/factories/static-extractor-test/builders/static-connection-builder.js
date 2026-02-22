/**
 * @fileoverview Static Connection Builder - Builder for creating multi-file static connection scenarios
 */

import { RouteBuilder } from './route-builder.js';
import { EnvBuilder } from './env-builder.js';
import { EventBuilder } from './event-builder.js';
import { StorageBuilder } from './storage-builder.js';
import { GlobalBuilder } from './global-builder.js';

export class StaticConnectionBuilder {
  constructor() {
    this.files = new Map();
  }

  /**
   * Add a file with route content
   * @param {string} filePath - File path
   * @param {Function} builderFn - Function that receives RouteBuilder
   */
  withRouteFile(filePath, builderFn) {
    const builder = new RouteBuilder();
    builderFn(builder);
    this.files.set(filePath, builder.build());
    return this;
  }

  /**
   * Add a file with env vars
   * @param {string} filePath - File path
   * @param {Function} builderFn - Function that receives EnvBuilder
   */
  withEnvFile(filePath, builderFn) {
    const builder = new EnvBuilder();
    builderFn(builder);
    this.files.set(filePath, builder.build());
    return this;
  }

  /**
   * Add a file with events
   * @param {string} filePath - File path
   * @param {Function} builderFn - Function that receives EventBuilder
   */
  withEventFile(filePath, builderFn) {
    const builder = new EventBuilder();
    builderFn(builder);
    this.files.set(filePath, builder.build());
    return this;
  }

  /**
   * Add a file with storage
   * @param {string} filePath - File path
   * @param {Function} builderFn - Function that receives StorageBuilder
   */
  withStorageFile(filePath, builderFn) {
    const builder = new StorageBuilder();
    builderFn(builder);
    this.files.set(filePath, builder.build());
    return this;
  }

  /**
   * Add a file with globals
   * @param {string} filePath - File path
   * @param {Function} builderFn - Function that receives GlobalBuilder
   */
  withGlobalFile(filePath, builderFn) {
    const builder = new GlobalBuilder();
    builderFn(builder);
    this.files.set(filePath, builder.build());
    return this;
  }

  /**
   * Create shared storage scenario
   */
  withSharedStorageScenario() {
    return this
      .withStorageFile('services/auth.js', builder => {
        builder.withLocalStorageWrite('token', '"jwt_123"');
      })
      .withStorageFile('components/Header.jsx', builder => {
        builder.withLocalStorageRead('token', 'userToken');
      })
      .withStorageFile('utils/api.js', builder => {
        builder.withLocalStorageRead('token', 'authToken');
      });
  }

  /**
   * Create shared event scenario
   */
  withSharedEventScenario() {
    return this
      .withEventFile('components/EventEmitter.js', builder => {
        builder.withEmitMethod('user:login', '{ id: 1 }');
      })
      .withEventFile('components/Listener1.jsx', builder => {
        builder.withOnMethod('user:login', 'handleLogin');
      })
      .withEventFile('components/Listener2.jsx', builder => {
        builder.withOnMethod('user:login', 'onUserLogin');
      });
  }

  /**
   * Create shared env scenario
   */
  withSharedEnvScenario() {
    return this
      .withEnvFile('config/api.js', builder => {
        builder.withProcessEnv('API_URL', 'apiUrl');
      })
      .withEnvFile('services/http.js', builder => {
        builder.withProcessEnv('API_URL', 'baseUrl');
      })
      .withEnvFile('utils/constants.js', builder => {
        builder.withProcessEnv('API_URL', 'endpoint');
      });
  }

  /**
   * Create shared global scenario
   */
  withSharedGlobalScenario() {
    return this
      .withGlobalFile('init.js', builder => {
        builder.withWindowWrite('appState', '{ version: "1.0" }');
      })
      .withGlobalFile('components/App.jsx', builder => {
        builder.withWindowRead('appState', 'state');
      })
      .withGlobalFile('utils/helpers.js', builder => {
        builder.withWindowRead('appState', 'appState');
      });
  }

  /**
   * Create shared route scenario
   */
  withSharedRouteScenario() {
    return this
      .withRouteFile('server/routes.js', builder => {
        builder.withServerRoute('get', '/api/users');
      })
      .withRouteFile('client/api.js', builder => {
        builder.withFetchCall('/api/users');
      })
      .withRouteFile('services/userService.js', builder => {
        builder.withAxiosCall('get', '/api/users');
      });
  }

  build() {
    const result = {};
    for (const [path, data] of this.files) {
      result[path] = data;
    }
    return result;
  }
}
