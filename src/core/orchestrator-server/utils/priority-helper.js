/**
 * @fileoverview Priority Helper Utilities
 * 
 * Single Responsibility: Handle priority calculations and conversions
 * 
 * @module orchestrator-server/utils/priority-helper
 */

/**
 * Priority levels mapping
 */
export const PRIORITY_LEVELS = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
};

/**
 * Get numeric priority level
 * @param {string} priority - Priority name
 * @returns {number} Priority level
 */
export function getPriorityLevel(priority) {
  return PRIORITY_LEVELS[priority] || 0;
}

/**
 * Compare two priorities
 * @param {string} priorityA - First priority
 * @param {string} priorityB - Second priority
 * @returns {number} -1 if A < B, 0 if equal, 1 if A > B
 */
export function comparePriority(priorityA, priorityB) {
  const levelA = getPriorityLevel(priorityA);
  const levelB = getPriorityLevel(priorityB);
  return levelA - levelB;
}

/**
 * Check if a job should preempt current job
 * @param {string} newPriority - Priority of new job
 * @param {string} currentPriority - Priority of current job
 * @returns {boolean} Whether new job should preempt
 */
export function shouldPreempt(newPriority, currentPriority) {
  return getPriorityLevel(newPriority) > getPriorityLevel(currentPriority);
}
