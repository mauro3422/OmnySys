/**
 * @fileoverview Deadlock Detection Analysis
 * @module race-detector/strategies/race-detection-strategy/analyzers/lock/analysis/deadlock
 */

/**
 * Encuentra potenciales deadlocks en el orden de locks
 * @param {Array} accesses - Array de puntos de acceso con info de locks
 * @returns {Array} - Escenarios potenciales de deadlock
 */
export function findPotentialDeadlocks(accesses) {
  const deadlocks = [];
  const lockOrders = new Map();

  // Track lock acquisition orders
  for (const access of accesses) {
    if (access.locks?.length > 1) {
      const key = access.atom;
      lockOrders.set(key, access.locks);
    }
  }

  // Check for circular dependencies
  for (const [atom1, locks1] of lockOrders) {
    for (const [atom2, locks2] of lockOrders) {
      if (atom1 === atom2) continue;

      if (isOppositeOrder(locks1, locks2)) {
        deadlocks.push({
          type: 'potential_deadlock',
          atoms: [atom1, atom2],
          lockOrders: [locks1, locks2]
        });
      }
    }
  }

  return deadlocks;
}

/**
 * Verifica si dos órdenes de lock son opuestos (circular)
 * @param {Array} order1 - Primer orden
 * @param {Array} order2 - Segundo orden
 * @returns {boolean}
 */
function isOppositeOrder(order1, order2) {
  if (order1.length !== order2.length) return false;

  for (let i = 0; i < order1.length; i++) {
    if (order1[i] !== order2[order2.length - 1 - i]) {
      return false;
    }
  }

  return true;
}
