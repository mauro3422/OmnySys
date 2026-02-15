/**
 * @fileoverview Data Flow Test Factory - Fixtures
 */

import { ASTNodeBuilder, OutputTestBuilder, TransformationTestBuilder, TypeInferrerTestBuilder } from './builders.js';

export const DataFlowTestFixtures = {
  simpleFunction: `
    function add(a, b) {
      return a + b;
    }
  `,

  functionWithSideEffect: `
    function updateUser(user) {
      console.log('Updating user');
      user.updatedAt = Date.now();
      return user;
    }
  `,

  asyncFunction: `
    async function fetchData(url) {
      const response = await fetch(url);
      return response.json();
    }
  `,

  arrowFunction: `
    const double = x => x * 2;
  `,

  functionWithDestructuring: `
    function processUser({ name, age }) {
      return { name: name.toUpperCase(), age: age + 1 };
    }
  `,

  functionWithArrayMethods: `
    function processItems(items) {
      return items
        .filter(item => item.active)
        .map(item => item.value)
        .reduce((sum, val) => sum + val, 0);
    }
  `,

  functionWithTryCatch: `
    function safeParse(json) {
      try {
        return JSON.parse(json);
      } catch (e) {
        return null;
      }
    }
  `,

  functionWithMutation: `
    function addToList(list, item) {
      list.push(item);
      return list.length;
    }
  `
};

// ═══════════════════════════════════════════════════════════════════════════════
// Validation Helpers
// ═══════════════════════════════════════════════════════════════════════════════


