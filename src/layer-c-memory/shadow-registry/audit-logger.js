/**
 * @fileoverview Decision Audit Logger - Sistema de auditoría de decisiones arquitectónicas
 *
 * Registra todas las decisiones importantes del sistema:
 * - Bypass de LLM por reglas
 * - Detección de arquetipos
 * - Invalidaciones de cache
 * - Re-análisis solicitados
 *
 * @module layer-c-memory/shadow-registry/audit-logger
 */

import path from 'path';
import fs from 'fs/promises';
import { DecisionType } from './types.js';
import { generateDecisionId } from './audit-logger/decision-id-generator.js';
import { createAuditEntry, appendAuditLine, readAuditFile, writeAuditFile } from './audit-logger/decision-logger.js';
import { calculateStats, getDecisionsForFile } from './audit-logger/decision-stats.js';
import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:shadow:audit');

/**
 * Logger de decisiones arquitectónicas
 */
export class DecisionAuditLogger {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.auditDir = path.join(projectPath, '.omnysysdata', 'decisions');
    this.auditFile = path.join(this.auditDir, 'audit-log.jsonl');
    this.decisions = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      await fs.mkdir(this.auditDir, { recursive: true });
      await this.loadExistingDecisions();
      this.initialized = true;
      logger.info(`📋 Decision audit logger initialized (${this.decisions.size} decisions)`);
    } catch (error) {
      logger.warn('⚠️ Failed to initialize audit logger:', error.message);
    }
  }

  async loadExistingDecisions() {
    const lines = await readAuditFile(this.auditFile);

    for (const line of lines) {
      try {
        const decision = JSON.parse(line);
        this.decisions.set(decision.decisionId, decision);
      } catch (e) {
        // Ignorar líneas corruptas
      }
    }
  }

  async logDecision(decision) {
    if (!this.initialized) {
      await this.initialize();
    }

    const decisionId = generateDecisionId();
    const auditEntry = createAuditEntry(decision, decisionId);

    this.decisions.set(decisionId, auditEntry);
    await appendAuditLine(this.auditFile, JSON.stringify(auditEntry) + '\n');

    logger.debug(`📝 Decision logged: ${auditEntry.type} for ${decision.filePath}`);
    return decisionId;
  }

  async logLLMBypass(filePath, reason, ruleId, context = {}) {
    return this.logDecision({
      type: DecisionType.LLM_BYPASS,
      filePath,
      reason,
      ruleId,
      context,
      confidence: 0.95,
      previousState: 'pending_llm',
      newState: 'bypassed'
    });
  }

  async logLLMRequired(filePath, reason, llmModel, context = {}) {
    return this.logDecision({
      type: DecisionType.LLM_REQUIRED,
      filePath,
      reason,
      llmModel,
      context,
      confidence: 0.8,
      previousState: 'pending_analysis',
      newState: 'sent_to_llm'
    });
  }

  async logArchetypeDetection(filePath, archetype, source, context = {}) {
    return this.logDecision({
      type: source === 'rule' ? DecisionType.ARCHETYPE_RULE : DecisionType.ARCHETYPE_LLM,
      filePath,
      reason: `Detected archetype: ${archetype.type}`,
      context: { archetype, ...context },
      confidence: archetype.confidence || 0.7,
      previousState: 'unknown',
      newState: archetype.type
    });
  }

  async logCacheInvalidation(filePath, reason, changeType, context = {}) {
    return this.logDecision({
      type: DecisionType.CACHE_INVALIDATION,
      filePath,
      reason,
      context: { changeType, ...context },
      confidence: 1.0,
      previousState: 'cached',
      newState: 'invalidated'
    });
  }

  getDecisionsForFile(filePath) {
    return getDecisionsForFile(this.decisions, filePath);
  }

  getStats() {
    return calculateStats(this.decisions);
  }

  async overrideDecision(decisionId, overriddenBy, reason) {
    const decision = this.decisions.get(decisionId);
    if (!decision) {
      throw new Error(`Decision not found: ${decisionId}`);
    }

    decision.overridden = true;
    decision.overriddenBy = overriddenBy;
    decision.overrideReason = reason;
    decision.overrideTimestamp = new Date().toISOString();

    const lines = Array.from(this.decisions.values()).map(d => JSON.stringify(d));
    await writeAuditFile(this.auditFile, lines);

    logger.info(`🔄 Decision overridden: ${decisionId} by ${overriddenBy}`);
    return decision;
  }
}

// Singleton por proyecto
const loggers = new Map();

export function getDecisionAuditLogger(projectPath) {
  if (!loggers.has(projectPath)) {
    loggers.set(projectPath, new DecisionAuditLogger(projectPath));
  }
  return loggers.get(projectPath);
}

export default DecisionAuditLogger;
