/**
 * @fileoverview Transaction Checker
 * 
 * Detects SQL and NoSQL transaction boundaries.
 * 
 * @module race-detector/mitigation/transaction-checker
 * @version 1.0.0
 */

import { findAtomById } from '../utils/index.js';

// Transaction patterns by ORM/DB
const TRANSACTION_PATTERNS = [
  // SQL transactions
  { type: 'sql', pattern: /BEGIN\s+TRANSACTION/i },
  { type: 'sql', pattern: /START\s+TRANSACTION/i },
  { type: 'sql', pattern: /COMMIT/i },
  { type: 'sql', pattern: /ROLLBACK/i },
  { type: 'sql', pattern: /SAVEPOINT/i },
  
  // Prisma
  { type: 'prisma', pattern: /prisma\.\$transaction/i },
  { type: 'prisma', pattern: /prisma\.[\w]+\.transaction/i },
  { type: 'prisma', pattern: /\$transaction\s*\(/i },
  
  // Sequelize
  { type: 'sequelize', pattern: /sequelize\.transaction/i },
  { type: 'sequelize', pattern: /\.transaction\s*\(/i },
  
  // MongoDB
  { type: 'mongodb', pattern: /session\.startTransaction/i },
  { type: 'mongodb', pattern: /session\.withTransaction/i },
  { type: 'mongodb', pattern: /session\.commitTransaction/i },
  { type: 'mongodb', pattern: /session\.abortTransaction/i },
  
  // TypeORM
  { type: 'typeorm', pattern: /getManager\(\)\.transaction/i },
  { type: 'typeorm', pattern: /queryRunner\.startTransaction/i },
  
  // Mongoose
  { type: 'mongoose', pattern: /\.session\s*\(/i },
  
  // Knex
  { type: 'knex', pattern: /knex\.transaction/i },
  
  // Objection.js
  { type: 'objection', pattern: /transaction\s*\(\s*\w+\s*=>/i }
];

/**
 * Check if access is within a database transaction
 * @param {Object} access - Access point to check
 * @param {Object} project - Project data
 * @returns {boolean} - True if in transaction
 */
export function isInTransaction(access, project) {
  const atom = findAtomById(access.atom, project);
  if (!atom?.code) return false;

  return TRANSACTION_PATTERNS.some(({ pattern }) => pattern.test(atom.code));
}

/**
 * Get transaction context for an access
 * @param {Object} access - Access point
 * @param {Object} project - Project data
 * @returns {Object|null} - Transaction context or null
 */
export function findTransactionContext(access, project) {
  const atom = findAtomById(access.atom, project);
  if (!atom?.code) return null;
  
  // ORM-specific transaction boundaries
  const txPatterns = [
    { type: 'prisma', start: /prisma\.\$transaction\s*\(/i },
    { type: 'sequelize', start: /sequelize\.transaction\s*\(/i },
    { type: 'mongodb', start: /session\.withTransaction\s*\(/i },
    { type: 'typeorm', start: /getManager\(\)\.transaction\s*\(/i }
  ];
  
  for (const { type, start } of txPatterns) {
    if (start.test(atom.code)) {
      return {
        type,
        sameBlock: true,
        transactionFunction: access.atom
      };
    }
  }
  
  return null;
}

/**
 * Check if two accesses are in the same transaction
 * @param {Object} access1 - First access
 * @param {Object} access2 - Second access
 * @param {Object} project - Project data
 * @returns {boolean} - True if same transaction
 */
export function sameTransaction(access1, access2, project) {
  const inT1 = isInTransaction(access1, project);
  const inT2 = isInTransaction(access2, project);
  
  if (!inT1 || !inT2) return false;
  
  // Same atom = definitely same transaction
  if (access1.atom === access2.atom) return true;
  
  // Same file and both in transaction blocks = likely same transaction
  if (access1.file === access2.file) {
    return true;
  }
  
  // Check transaction context
  const context1 = findTransactionContext(access1, project);
  const context2 = findTransactionContext(access2, project);
  
  if (!context1 || !context2) return false;
  
  return context1.transactionFunction === context2.transactionFunction;
}
