import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import { createConditionalJsonMiddleware as createConditionalJsonMiddlewareImpl, buildJsonRpcErrorResponse } from './mcp/http-session-routing-helpers.js';
import { shouldSkipStaleInitRecovery } from './mcp/http-session-routing-handlers.impl.js';
import { asJsonResource } from '#shared/utils/normalize-helpers.js';
export {
  executeMcpToolCall,
  handleMcpRequest
} from './mcp/http-session-routing-handlers.impl.js';
export { buildJsonRpcErrorResponse };

const RESOURCE_URIS = {
  status: 'omnysys://status',
  health: 'omnysys://health',
  sessions: 'omnysys://sessions',
  transport: 'omnysys://transport',
  mcpTopology: 'omnysys://mcp-topology',
  tools: 'omnysys://tools',
  schema: 'omnysys://schema'
};

const MCP_POST_ACCEPT_TYPES = ['application/json', 'text/event-stream'];
const MCP_GET_ACCEPT_TYPES = ['text/event-stream'];

export function createConditionalJsonMiddleware(logger) {
  return createConditionalJsonMiddlewareImpl(logger, buildJsonRpcErrorResponse);
}

function mergeAcceptHeader(currentValue, requiredTypes) {
  const normalized = String(currentValue || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const seen = new Set(normalized.map((value) => value.toLowerCase()));
  for (const requiredType of requiredTypes) {
    if (!seen.has(requiredType)) {
      normalized.push(requiredType);
      seen.add(requiredType);
    }
  }

  return normalized.join(', ');
}

function applyNodeHeaderOverride(req, headerName, headerValue) {
  if (!req?.headers) {
    return;
  }

  const normalizedHeaderName = headerName.toLowerCase();
  req.headers[normalizedHeaderName] = headerValue;

  if (req.headersDistinct && typeof req.headersDistinct === 'object') {
    req.headersDistinct[normalizedHeaderName] = [headerValue];
  }

  if (!Array.isArray(req.rawHeaders)) {
    return;
  }

  let replaced = false;
  for (let index = 0; index < req.rawHeaders.length; index += 2) {
    if (String(req.rawHeaders[index] || '').toLowerCase() === normalizedHeaderName) {
      req.rawHeaders[index + 1] = headerValue;
      replaced = true;
    }
  }

  if (!replaced) {
    req.rawHeaders.push(headerName, headerValue);
  }
}

export function normalizeMcpRequestHeaders(req, logger) {
  if (!req?.headers) {
    return;
  }

  const method = String(req.method || '').toUpperCase();
  const requiredTypes = method === 'POST'
    ? MCP_POST_ACCEPT_TYPES
    : method === 'GET'
      ? MCP_GET_ACCEPT_TYPES
      : null;

  if (!requiredTypes) {
    return;
  }

  const headerName = Object.keys(req.headers).find((name) => name.toLowerCase() === 'accept') || 'accept';
  const originalValue = req.headers[headerName];
  const normalizedValue = mergeAcceptHeader(originalValue, requiredTypes);

  if (normalizedValue && normalizedValue !== originalValue) {
    applyNodeHeaderOverride(req, headerName, normalizedValue);
    logger?.debug?.(`[MCP COMPAT] Normalized Accept header for ${method} ${req.path || '/mcp'} -> ${normalizedValue}`);
  }
}

export function buildServerForSession({
  logger,
  getLiveToolDefinitions,
  executeMcpToolCall,
  getRuntimeResourceSnapshot,
  transportContext = null
}) {
  const sessionServer = new Server(
    { name: 'omnysys', version: '3.0.0' },
    { capabilities: { tools: {}, resources: {} } }
  );

  sessionServer.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: await getLiveToolDefinitions()
  }));

  sessionServer.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: RESOURCE_URIS.status,
        name: 'status',
        title: 'OmnySys Status',
        description: 'Live runtime status, health, and readiness snapshot.',
        mimeType: 'application/json'
      },
      {
        uri: RESOURCE_URIS.health,
        name: 'health',
        title: 'OmnySys Health',
        description: 'Health and boot summary for the MCP daemon.',
        mimeType: 'application/json'
      },
      {
        uri: RESOURCE_URIS.sessions,
        name: 'sessions',
        title: 'MCP Sessions',
        description: 'Current session persistence and deduplication summary.',
        mimeType: 'application/json'
      },
      {
        uri: RESOURCE_URIS.transport,
        name: 'transport',
        title: 'MCP Transport',
        description: 'Current transport provenance and drift summary.',
        mimeType: 'application/json'
      },
      {
        uri: RESOURCE_URIS.mcpTopology,
        name: 'mcp-topology',
        title: 'MCP Topology',
        description: 'Live MCP transport, session, bridge, proxy, and request delivery topology.',
        mimeType: 'application/json'
      },
      {
        uri: RESOURCE_URIS.tools,
        name: 'tools',
        title: 'MCP Tools',
        description: 'Current tool registry snapshot.',
        mimeType: 'application/json'
      },
      {
        uri: RESOURCE_URIS.schema,
        name: 'schema',
        title: 'OmnySys MCP Schema',
        description: 'Runtime MCP capability and resource schema summary.',
        mimeType: 'application/json'
      }
    ]
  }));

  sessionServer.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
    resourceTemplates: []
  }));

  sessionServer.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    if (!getRuntimeResourceSnapshot) {
      throw new McpError(ErrorCode.InvalidParams, 'Resource snapshot provider not configured');
    }

    const snapshot = await getRuntimeResourceSnapshot();
    const uri = request.params.uri;

    if (uri === RESOURCE_URIS.status) {
      return {
        contents: [asJsonResource(
          uri,
          snapshot.status,
          {
            name: 'status',
            title: 'OmnySys Status',
            description: 'Live runtime status, health, and readiness snapshot.'
          }
        )]
      };
    }

    if (uri === RESOURCE_URIS.health) {
      return {
        contents: [asJsonResource(
          uri,
          snapshot.health,
          {
            name: 'health',
            title: 'OmnySys Health',
            description: 'Health and boot summary for the MCP daemon.'
          }
        )]
      };
    }

    if (uri === RESOURCE_URIS.sessions) {
      return {
        contents: [asJsonResource(
          uri,
          snapshot.sessions,
          {
            name: 'sessions',
            title: 'MCP Sessions',
            description: 'Current session persistence and deduplication summary.'
          }
        )]
      };
    }

    if (uri === RESOURCE_URIS.transport) {
      return {
        contents: [asJsonResource(
          uri,
          snapshot.transport,
          {
            name: 'transport',
            title: 'MCP Transport',
            description: 'Current transport provenance and drift summary.'
          }
        )]
      };
    }

    if (uri === RESOURCE_URIS.mcpTopology) {
      return {
        contents: [asJsonResource(
          uri,
          snapshot.topology,
          {
            name: 'mcp-topology',
            title: 'MCP Topology',
            description: 'Live MCP transport, session, bridge, proxy, and request delivery topology.'
          }
        )]
      };
    }

    if (uri === RESOURCE_URIS.tools) {
      return {
        contents: [asJsonResource(
          uri,
          snapshot.tools,
          {
            name: 'tools',
            title: 'MCP Tools',
            description: 'Current tool registry snapshot.'
          }
        )]
      };
    }

    if (uri === RESOURCE_URIS.schema) {
      return {
        contents: [asJsonResource(
          uri,
          snapshot.schema,
          {
            name: 'schema',
            title: 'OmnySys MCP Schema',
            description: 'Runtime MCP capability and resource schema summary.'
          }
        )]
      };
    }

    throw new McpError(ErrorCode.InvalidParams, `Unknown resource: ${uri}`);
  });

  sessionServer.setRequestHandler(CallToolRequestSchema, async (request) => (
    executeMcpToolCall(request, { transportContext })
  ));

  sessionServer.onerror = (error) => {
    logger.error(`[MCP Error] ${error?.message || error}`);
  };

  return sessionServer;
}
