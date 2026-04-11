import { runConsolidateConceptualCluster } from './consolidate-conceptual-cluster-impl.js';

export async function consolidate_conceptual_cluster(args, context) {
  return runConsolidateConceptualCluster(args, context);
}

export default { consolidate_conceptual_cluster };
