import { executeFolderizationTransaction } from '../../../../shared/compiler/index.js';

export async function executeFolderizationPlan(args) {
  return await executeFolderizationTransaction(args);
}
