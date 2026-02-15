/**
 * @fileoverview Race Detector Test Factory - Constants
 */

export const RaceTestConstants = {
  RACE_TYPES: {
    READ_WRITE: 'RW',
    WRITE_WRITE: 'WW',
    INIT_EXEC: 'IE',
    EVENT_HANDLER: 'EH',
    OTHER: 'OTHER'
  },

  SEVERITY_LEVELS: ['low', 'medium', 'high', 'critical'],

  SEVERITY_WEIGHTS: {
    low: 0.25,
    medium: 0.5,
    high: 0.75,
    critical: 1.0
  },

  STATE_TYPES: {
    GLOBAL: 'global',
    MODULE: 'module',
    EXTERNAL: 'external',
    SINGLETON: 'singleton',
    CLOSURE: 'closure'
  },

  MITIGATION_TYPES: {
    ATOMIC: 'atomic',
    LOCK: 'lock',
    QUEUE: 'queue',
    IMMUTABLE: 'immutable',
    TRANSACTION: 'transaction',
    SEQUENTIAL: 'sequential',
    PARTIAL_LOCK: 'partial-lock'
  },

  ASYNC_PATTERNS: {
    BOTH: 'both',
    ONE: 'one',
    NONE: 'none'
  },

  SAMPLE_CODE: {
    COUNTER_RACE: `
      let counter = 0;
      
      async function increment() {
        const current = counter;  // Read
        counter = current + 1;     // Write
      }
      
      async function decrement() {
        const current = counter;  // Read
        counter = current - 1;     // Write
      }
    `,

    SINGLETON_RACE: `
      let instance = null;
      
      async function getInstance() {
        if (!instance) {           // Read
          instance = new MyClass(); // Write
        }
        return instance;
      }
    `,

    ARRAY_RACE: `
      const items = [];
      
      async function addItem(item) {
        items.push(item);          // Read + Write
      }
      
      async function removeItem() {
        items.pop();               // Read + Write
      }
    `,

    LOCK_PROTECTED: `
      const mutex = new Mutex();
      
      async function safeWrite(value) {
        await mutex.acquire();
        try {
          sharedVar = value;
        } finally {
          mutex.release();
        }
      }
    `,

    ATOMIC_OPERATION: `
      function atomicIncrement() {
        return Atomics.add(sharedArray, 0, 1);
      }
    `,

    IMMUTABLE_UPDATE: `
      import Immutable from 'immutable';
      
      function updateState(key, value) {
        state = state.set(key, value);
      }
    `,

    TRANSACTION_PROTECTED: `
      async function updateWithTransaction(data) {
        return await prisma.$transaction(async (tx) => {
          await tx.user.update({ where: { id: 1 }, data });
        });
      }
    `,

    QUEUE_SERIALIZED: `
      const queue = new PQueue({ concurrency: 1 });
      
      async function serializedWrite(value) {
        await queue.add(() => {
          sharedVar = value;
        });
      }
    `
  }
};

/**
 * Mock factory for creating test doubles
 */

