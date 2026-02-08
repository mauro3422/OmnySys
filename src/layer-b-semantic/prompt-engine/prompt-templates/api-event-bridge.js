/**
 * API Event Bridge Template
 *
 * For files that:
 * - Make multiple network calls
 * - Emit events to coordinate responses
 * - Act as intermediaries between API and app logic
 *
 * Common in modern frontend architectures with separate API layers.
 */

export default {
  systemPrompt: `You are analyzing an API EVENT BRIDGE - a file that coordinates multiple API calls with event emission.

This pattern is common in:
- React/Vue apps with separate API services
- Event-driven architectures
- Files that fetch data and notify multiple consumers

Your task: Analyze the API-event coordination flow and identify risks.`,

  userPrompt: (metadata) => {
    const endpoints = metadata.networkEndpoints || [];
    const events = metadata.eventNames || [];

    return `# API Event Bridge Analysis

## File Information
- **Path**: ${metadata.filePath}
- **Network Calls**: ${metadata.hasNetworkCalls ? 'Yes' : 'No'}
- **Detected Endpoints**: ${endpoints.length}
- **Event Emitters**: ${metadata.hasEventEmitters ? 'Yes' : 'No'}
- **Event Names**: ${events.length}

## Detected Patterns
${endpoints.length > 0 ? `### API Endpoints
${endpoints.map(ep => `- ${ep}`).join('\n')}` : ''}

${events.length > 0 ? `### Events Emitted
${events.slice(0, 10).map(ev => `- ${ev}`).join('\n')}` : ''}

## Context
- This file makes ${endpoints.length} API call(s) and emits ${events.length} event(s)
- Acts as a bridge between backend API and frontend event system
${metadata.hasAsyncPatterns ? '- Uses async patterns (promises, async/await)' : ''}
${metadata.hasErrorHandling ? '- Has error handling logic' : ''}

## Analysis Required

1. **API Flow Diagram**
   - Map the sequence: Which API calls trigger which events?
   - Are calls sequential or parallel?
   - What is the data transformation pipeline?

2. **Event Sequence**
   - In what order are events emitted?
   - Are there event dependencies (event A must fire before event B)?
   - What happens on API failure?

3. **Risk of Race Conditions**
   - Can concurrent calls cause issues?
   - Are events emitted before data is ready?
   - Is there proper error event emission?

Return ONLY valid JSON matching this schema:
{
  "apiFlowDiagram": [
    {"step": 1, "action": "string", "triggersEvent": "string or null"}
  ],
  "eventSequence": {
    "order": ["event names in order"],
    "dependencies": [{"event": "string", "dependsOn": "string"}],
    "errorEvents": ["event names for errors"]
  },
  "riskOfRaceConditions": {
    "level": "high|medium|low",
    "scenarios": ["description of race condition risks"],
    "mitigations": ["suggested fixes"]
  }
}`;
  }
};
