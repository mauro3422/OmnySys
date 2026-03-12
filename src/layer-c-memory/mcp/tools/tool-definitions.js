import { queryToolDefinitions } from './tool-definition-query.js';
import { actionToolDefinitions } from './tool-definition-action.js';
import { adminToolDefinitions } from './tool-definition-admin.js';

export const toolDefinitions = [
  ...queryToolDefinitions,
  ...actionToolDefinitions,
  ...adminToolDefinitions
];
