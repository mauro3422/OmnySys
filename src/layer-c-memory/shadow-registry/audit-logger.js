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

import fs from 'fs/promises';
import path from 'path';
import { DecisionType } from './types.js';
import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:shadow:audit');

/**
 * Genera ID único para decisión
 */
function generateDecisionId() {
  return `dec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Logger de decisiones arquitectónicas
 */
export class DecisionAuditLogger {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.auditDir = path.join(projectPath, '.omnysysdata', 'decisions');
    this.auditFile = path.join(this.auditDir, 'audit-log.jsonl');
    this.decisions = new Map(); // Cache en memoria para consultas rápidas
    this.initialized = false;
  }

  /**
   * Inicializa el logger
   */
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

  /**
   * Carga decisiones existentes
   */
  async loadExistingDecisions() {
    try {
      const content = await fs.readFile(this.auditFile, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const decision = JSON.parse(line);
          this.decisions.set(decision.decisionId, decision);
        } catch (e) {
          // Ignorar líneas corruptas
        }
      }
    } catch {
      // No existe archivo, empezar vacío
    }
  }

  /**
   * Loguea una decisión arquitectónica
   * 
   * @param {Object} decision - Datos de la decisión
   * @param {DecisionType} decision.type - Tipo de decisión
   * @param {string} decision.filePath - Archivo afectado
   * @param {string} decision.reason - Razón de la decisión
   * @param {number} decision.confidence - Confianza 0-1
   * @param {Object} decision.context - Contexto completo
   * @param {string} [decision.ruleId] - ID de regla aplicada
   * @param {string} [decision.llmModel] - Modelo LLM usado
   * @param {Object} [decision.metadata] - Metadata usada
   * @param {string} decision.previousState - Estado anterior
   * @param {string} decision.newState - Estado nuevo
   */
  async logDecision(decision) {
    if (!this.initialized) {
      await this.initialize();
    }

    const auditEntry = {
      decisionId: generateDecisionId(),
      type: decision.type,
      filePath: decision.filePath,
      timestamp: new Date().toISOString(),
      reason: decision.reason,
      confidence: decision.confidence ?? 1.0,
      context: decision.context || {},
      ruleId: decision.ruleId || null,
      llmModel: decision.llmModel || null,
      metadata: decision.metadata || null,
      previousState: decision.previousState || 'unknown',
      newState: decision.newState || 'unknown',
      overridden: false,
      overriddenBy: null,
      overrideReason: null
    };

    // Guardar en memoria
    this.decisions.set(auditEntry.decisionId, auditEntry);

    // Append al archivo
    try {
      const line = JSON.stringify(auditEntry) + '\n';
      await fs.appendFile(this.auditFile, line);
      
      logger.debug(`📝 Decision logged: ${auditEntry.type} for ${decision.filePath}`);
    } catch (error) {
      logger.warn('⚠️ Failed to write decision:', error.message);
    }

    return auditEntry.decisionId;
  }

  /**
   * Loguea bypass de LLM
   */
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

  /**
   * Loguea envío a LLM
   */
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

  /**
   * Loguea detección de arquetipo
   */
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

  /**
   * Loguea invalidación de cache
   */
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

  /**
   * Obtiene decisiones para un archivo
   */
  getDecisionsForFile(filePath) {
    return Array.from(this.decisions.values())
      .filter(d => d.filePath === filePath)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Obtiene estadísticas de decisiones
   */
  getStats() {
    const stats = {
      total: this.decisions.size,
      byType: {},
      byFile: {},
      recent: []
    };

    for (const decision of this.decisions.values()) {
      // Por tipo
      stats.byType[decision.type] = (stats.byType[decision.type] || 0) + 1;
      
      // Por archivo
      stats.byFile[decision.filePath] = (stats.byFile[decision.filePath] || 0) + 1;
    }

    // Decisiones recientes (últimas 10)
    stats.recent = Array.from(this.decisions.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);

    return stats;
  }

  /**
   * Sobrescribe una decisión (para correcciones manuales)
   */
  async overrideDecision(decisionId, overriddenBy, reason) {
    const decision = this.decisions.get(decisionId);
    if (!decision) {
      throw new Error(`Decision not found: ${decisionId}`);
    }

    decision.overridden = true;
    decision.overriddenBy = overriddenBy;
    decision.overrideReason = reason;
    decision.overrideTimestamp = new Date().toISOString();

    // Re-escribir todo el archivo (ineficiente pero raro)
    await this.saveAllDecisions();

    logger.info(`🔄 Decision overridden: ${decisionId} by ${overriddenBy}`);
    return decision;
  }

  /**
   * Guarda todas las decisiones (para override)
   */
  async saveAllDecisions() {
    const lines = Array.from(this.decisions.values())
      .map(d => JSON.stringify(d))
      .join('\n') + '\n';
    
    await fs.writeFile(this.auditFile, lines);
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
