/**
 * @fileoverview Queue Checker
 * 
 * Detects async queue implementations that serialize operations.
 * 
 * @module race-detector/mitigation/queue-checker
 * @version 1.0.0
 */

import { findAtomById, extractQueueName } from '../utils/index.js';

// Queue patterns
const QUEUE_PATTERNS = [
  // Queue libraries
  /async\s*\.queue/i,
  /p-queue/i,
  /bull|bullmq/i,
  /bee-queue/i,
  /kue/i,
  /Agenda/i,
  /node-cron/i,
  /Bree/i,
  
  // Rate limiting / Concurrency control
  /p-limit/i,
  /p-throttle/i,
  /bottleneck/i,
  /rate-limiter/i,
  
  // Framework patterns
  /queue\.add\s*\(/i,
  /queue\.process/i,
  /queue\.on\s*\(/i,
  /concurrent\s*:\s*\d+/i,
  /concurrency\s*:\s*\d+/i,
  
  // Worker pools
  /worker_threads/i,
  /Worker\s*\(/i,
  /workerpool/i,
  /worker-farm/i,
  /jest-worker/i,
  
  // Message queues
  /amqp/i,
  /rabbitmq/i,
  /kafka/i,
  /sqs/i,
  /pubsub/i,
  
  // Task queues
  /task\.queue/i,
  /job\.queue/i,
  /background\.job/i
];

/**
 * Check if access uses async queue for serialization
 * @param {Object} access - Access point to check
 * @param {Object} project - Project data
 * @returns {boolean} - True if uses queue
 */
export function hasAsyncQueue(access, project) {
  const atom = findAtomById(access.atom, project);
  if (!atom?.code) return false;

  return QUEUE_PATTERNS.some(pattern => pattern.test(atom.code));
}

/**
 * Check if two accesses use the same queue
 * @param {Object} access1 - First access
 * @param {Object} access2 - Second access
 * @param {Object} project - Project data
 * @returns {boolean} - True if same queue
 */
export function sameQueue(access1, access2, project) {
  // If both in same file and use queue, likely same queue
  if (access1.file === access2.file) return true;
  
  // Check for shared queue instance
  const atom1 = findAtomById(access1.atom, project);
  const atom2 = findAtomById(access2.atom, project);
  
  if (!atom1?.code || !atom2?.code) return false;
  
  // Extract queue names and compare
  const queue1 = extractQueueName(atom1.code);
  const queue2 = extractQueueName(atom2.code);
  
  return queue1 && queue2 && queue1 === queue2;
}

/**
 * Get queue details
 * @param {Object} access - Access point
 * @param {Object} project - Project data
 * @returns {Object|null} - Queue details or null
 */
export function getQueueDetails(access, project) {
  const atom = findAtomById(access.atom, project);
  if (!atom?.code) return null;
  
  const queueName = extractQueueName(atom.code);
  
  if (queueName) {
    return {
      type: 'queue',
      name: queueName,
      confidence: 'medium'
    };
  }
  
  return null;
}
