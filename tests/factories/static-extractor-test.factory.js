/**
 * @fileoverview Static Extractor Test Factory (Modular Entry)
 */

export {
  RouteBuilder,
  EnvBuilder,
  EventBuilder,
  StorageBuilder,
  GlobalBuilder,
  StaticConnectionBuilder
} from './static-extractor-test/builders/index.js';

export { StaticScenarios } from './static-extractor-test/scenarios.js';
export { StaticValidators } from './static-extractor-test/validators.js';

import {
  RouteBuilder,
  EnvBuilder,
  EventBuilder,
  StorageBuilder,
  GlobalBuilder,
  StaticConnectionBuilder
} from './static-extractor-test/builders/index.js';
import { StaticScenarios } from './static-extractor-test/scenarios.js';
import { StaticValidators } from './static-extractor-test/validators.js';

export default {
  RouteBuilder,
  EnvBuilder,
  EventBuilder,
  StorageBuilder,
  GlobalBuilder,
  StaticConnectionBuilder,
  StaticScenarios,
  StaticValidators
};