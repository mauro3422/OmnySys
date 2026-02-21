/**
 * @fileoverview Race Pattern Factory
 * Factory for creating common race condition patterns
 */

import { RaceScenarioBuilder } from './race-scenario-builder.js';

export class RacePatternFactory {
  static readWriteRace() {
    return new RaceScenarioBuilder()
      .withAtom('atom-1', 'reader', { isAsync: true })
      .withAtom('atom-2', 'writer', { isAsync: true })
      .withSharedState('counter', {
        locations: [
          { atomId: 'atom-1', type: 'read' },
          { atomId: 'atom-2', type: 'write' }
        ]
      })
      .withReadAccess('atom-1', 'counter', 10)
      .withWriteAccess('atom-2', 'counter', 20)
      .build();
  }

  static writeWriteRace() {
    return new RaceScenarioBuilder()
      .withAtom('atom-1', 'writer1', { isAsync: true })
      .withAtom('atom-2', 'writer2', { isAsync: true })
      .withSharedState('sharedArray')
      .withWriteAccess('atom-1', 'sharedArray', 15)
      .withWriteAccess('atom-2', 'sharedArray', 25)
      .build();
  }

  static singletonRace() {
    return new RaceScenarioBuilder()
      .withAtom('atom-1', 'getInstance1', { isAsync: true })
      .withAtom('atom-2', 'getInstance2', { isAsync: true })
      .withSharedState('singletonInstance')
      .withWriteAccess('atom-1', 'singletonInstance', 5)
      .withWriteAccess('atom-2', 'singletonInstance', 8)
      .build();
  }

  static counterRace() {
    return new RaceScenarioBuilder()
      .withAtom('atom-1', 'increment', { isAsync: true })
      .withAtom('atom-2', 'decrement', { isAsync: true })
      .withSharedState('count', { type: 'counter' })
      .withReadAccess('atom-1', 'count', 10)
      .withWriteAccess('atom-1', 'count', 11)
      .withReadAccess('atom-2', 'count', 20)
      .withWriteAccess('atom-2', 'count', 21)
      .build();
  }

  static lazyInitializationRace() {
    return new RaceScenarioBuilder()
      .withAtom('atom-1', 'initLazy1', { isAsync: true })
      .withAtom('atom-2', 'initLazy2', { isAsync: true })
      .withSharedState('lazyValue')
      .withReadAccess('atom-1', 'lazyValue', 5)
      .withWriteAccess('atom-1', 'lazyValue', 8)
      .withReadAccess('atom-2', 'lazyValue', 12)
      .withWriteAccess('atom-2', 'lazyValue', 15)
      .build();
  }

  static noRaceSafeAccess() {
    return new RaceScenarioBuilder()
      .withAtom('atom-1', 'safeReader', { isAsync: false })
      .withAtom('atom-2', 'safeWriter', { isAsync: false })
      .withSharedState('safeVar')
      .withReadAccess('atom-1', 'safeVar', 10)
      .withWriteAccess('atom-2', 'safeVar', 20)
      .build();
  }

  static atomicOperation() {
    return new RaceScenarioBuilder()
      .withAtom('atom-1', 'atomicIncrement', { 
        isAsync: true,
        code: 'Atomics.add(counter, 0, 1)'
      })
      .withAtom('atom-2', 'atomicDecrement', { 
        isAsync: true,
        code: 'Atomics.sub(counter, 0, 1)'
      })
      .withSharedState('atomicCounter', { isAtomic: true })
      .build();
  }

  static lockedAccess() {
    return new RaceScenarioBuilder()
      .withAtom('atom-1', 'lockedWriter1', { 
        isAsync: true,
        code: 'await mutex.lock(); sharedVar = 1; mutex.unlock();'
      })
      .withAtom('atom-2', 'lockedWriter2', { 
        isAsync: true,
        code: 'await mutex.lock(); sharedVar = 2; mutex.unlock();'
      })
      .withSharedState('lockedVar')
      .withWriteAccess('atom-1', 'lockedVar', 15)
      .withWriteAccess('atom-2', 'lockedVar', 25)
      .build();
  }

  static globalVariableAccess() {
    return new RaceScenarioBuilder()
      .withAtom('atom-1', 'globalWriter1', {
        isAsync: true,
        dataFlow: {
          sideEffects: [
            { type: 'write', variable: 'window.globalVar', target: 'window.globalVar' }
          ]
        }
      })
      .withAtom('atom-2', 'globalWriter2', {
        isAsync: true,
        dataFlow: {
          sideEffects: [
            { type: 'write', variable: 'window.globalVar', target: 'window.globalVar' }
          ]
        }
      })
      .withSharedState('window.globalVar')
      .build();
  }

  static moduleStateAccess() {
    return new RaceScenarioBuilder()
      .withAtom('atom-1', 'moduleWriter1', {
        isAsync: true,
        dataFlow: {
          sideEffects: [
            { type: 'module_state_write', target: 'module.sharedState' }
          ]
        }
      })
      .withAtom('atom-2', 'moduleWriter2', {
        isAsync: true,
        dataFlow: {
          sideEffects: [
            { type: 'module_state_write', target: 'module.sharedState' }
          ]
        }
      })
      .withSharedState('module.sharedState')
      .build();
  }
}
