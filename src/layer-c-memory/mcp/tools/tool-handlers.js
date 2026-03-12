import { queryToolHandlers } from './tool-handler-query.js';
import { actionToolHandlers } from './tool-handler-action.js';
import { adminToolHandlers } from './tool-handler-admin.js';

export const toolHandlers = {
  ...queryToolHandlers,
  ...actionToolHandlers,
  ...adminToolHandlers
};
