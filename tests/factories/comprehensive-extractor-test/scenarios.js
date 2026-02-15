/**
 * @fileoverview Comprehensive Extractor Test Factory - Scenarios
 */

export class ExtractionScenarioFactory {
  static emptyFile() {
    return {
      code: '',
      filePath: 'test/empty.js'
    };
  }

  static simpleModule() {
    return {
      code: `
import { helper } from './helper';

export function greet(name) {
  return helper(name);
}

export default greet;
      `.trim(),
      filePath: 'test/module.js'
    };
  }

  static complexModule() {
    return {
      code: `
import React, { useState, useEffect } from 'react';
import * as utils from './utils';
import './styles.css';

const { helper } = require('./common');

export class Component extends React.Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
  }

  async handleClick() {
    const data = await fetch('/api/data');
    this.setState({ data });
  }

  render() {
    return <div>{this.state.count}</div>;
  }
}

export const useCounter = (initial = 0) => {
  const [count, setCount] = useState(initial);
  return { count, setCount };
};

export function* generator() {
  yield 1;
  yield 2;
  yield 3;
}

export { helper } from './common';
export * from './types';

export default Component;
      `.trim(),
      filePath: 'test/complex.tsx'
    };
  }

  static testFile() {
    return {
      code: `
import { describe, it, expect } from 'vitest';
import { myFunction } from './module';

describe('myFunction', () => {
  it('should work', () => {
    expect(myFunction()).toBe(true);
  });
});
      `.trim(),
      filePath: 'test/module.test.js'
    };
  }

  static configFile() {
    return {
      code: `
export default {
  port: 3000,
  host: 'localhost'
};
      `.trim(),
      filePath: 'test/app.config.js'
    };
  }

  static barrelFile() {
    return {
      code: `
export * from './components';
export * from './utils';
export * from './hooks';
      `.trim(),
      filePath: 'test/index.js'
    };
  }

  static singletonPattern() {
    return {
      code: `
export class Singleton {
  static instance;

  static getInstance() {
    if (!Singleton.instance) {
      Singleton.instance = new Singleton();
    }
    return Singleton.instance;
  }

  constructor() {
    if (Singleton.instance) {
      throw new Error('Use getInstance()');
    }
  }
}
      `.trim(),
      filePath: 'test/singleton.js'
    };
  }

  static factoryPattern() {
    return {
      code: `
export function createUser(data) {
  return {
    id: data.id,
    name: data.name
  };
}

export class UserFactory {
  create(data) {
    return createUser(data);
  }
}
      `.trim(),
      filePath: 'test/factory.js'
    };
  }

  static asyncPatterns() {
    return {
      code: `
export async function fetchData() {
  const response = await fetch('/api/data');
  return response.json();
}

export function fetchWithPromise() {
  return fetch('/api/data')
    .then(r => r.json())
    .then(data => data.items);
}

export async function parallelFetch() {
  const [a, b] = await Promise.all([
    fetch('/a'),
    fetch('/b')
  ]);
  return { a, b };
}
      `.trim(),
      filePath: 'test/async.js'
    };
  }
}

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validation utilities for extraction results
 */