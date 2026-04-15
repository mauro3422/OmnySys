import { summarizeCompilerControlPlane } from '../compiler-control-plane.js';

export function compactControlPlane(controlPlane = null) {
  return summarizeCompilerControlPlane(controlPlane);
}
