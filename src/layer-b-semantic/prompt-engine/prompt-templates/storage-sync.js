/**
 * Storage Sync Template
 *
 * For files that:
 * - Use localStorage/sessionStorage
 * - Listen to 'storage' events
 * - Coordinate state across multiple browser tabs
 *
 * Multi-tab synchronization is complex and bug-prone.
 */

export default {
  systemPrompt: `You are analyzing a STORAGE SYNC MANAGER - a file that coordinates state across multiple browser tabs.

This pattern involves:
- Writing to localStorage/sessionStorage
- Listening to 'storage' events (fired when other tabs modify storage)
- Synchronizing in-memory state with persisted storage

Your task: Analyze the sync pattern and identify consistency/race condition risks.`,

  userPrompt: (metadata) => {
    const storageKeys = metadata.localStorageKeys || [];
    const events = metadata.eventNames || [];
    const connections = metadata.semanticConnections || [];

    return `# Storage Sync Manager Analysis

## File Information
- **Path**: ${metadata.filePath}
- **Has localStorage**: ${metadata.hasLocalStorage ? 'Yes' : 'No'}
- **Has Event Listeners**: ${metadata.hasEventListeners ? 'Yes' : 'No'}
- **Storage Keys**: ${storageKeys.length}
- **Semantic Connections**: ${connections.length} files

## Detected Patterns
${storageKeys.length > 0 ? `### Storage Keys
${storageKeys.map(key => `- ${key}`).join('\\n')}` : ''}

${events.includes('storage') ? `### Storage Event Listener
- Listening to "storage" events (multi-tab sync)` : ''}

## Context
- This file manages ${storageKeys.length} storage key(s) shared across tabs
- ${connections.length} other file(s) also access localStorage
${metadata.hasLifecycleHooks ? '- Uses lifecycle hooks for initialization' : ''}
${metadata.hasCleanupPatterns ? '- Has cleanup patterns (good!)' : '- WARNING: No cleanup patterns detected'}

## Analysis Required

1. **Sync Patterns**
   - What triggers storage writes? (user action, timer, API response?)
   - What triggers storage reads? (mount, storage event, prop change?)
   - Are reads and writes properly sequenced?

2. **Conflict Resolution**
   - What happens if two tabs write to the same key simultaneously?
   - Is there a "last write wins" or merge strategy?
   - Are there any locks or version checks?

3. **Consistency Guarantees**
   - Can stale data be read after a storage event?
   - Is the in-memory state always in sync with storage?
   - What happens if storage is corrupted/invalid JSON?

Return ONLY valid JSON matching this schema:
{
  "syncPatterns": {
    "writeTriggers": ["description of write triggers"],
    "readTriggers": ["description of read triggers"],
    "sequencing": "description of read/write order"
  },
  "conflictResolution": {
    "strategy": "last-write-wins|merge|lock|none",
    "hasVersioning": true|false,
    "raceConditionRisk": "high|medium|low"
  },
  "consistencyGuarantees": {
    "canReadStale": true|false,
    "hasValidation": true|false,
    "errorHandling": "description",
    "recommendations": ["suggested improvements"]
  }
}`;
  }
};
