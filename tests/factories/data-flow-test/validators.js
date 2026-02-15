/**
 * @fileoverview Data Flow Test Factory - Validators
 */

export class DataFlowValidator {
  static isValidOutput(output) {
    return output &&
           typeof output === 'object' &&
           'type' in output &&
           ['return', 'throw', 'side_effect'].includes(output.type);
  }

  static isValidTransformation(transform) {
    return transform &&
           typeof transform === 'object' &&
           'to' in transform &&
           'from' in transform &&
           'operation' in transform;
  }

  static isValidTypeInference(inference) {
    return inference &&
           typeof inference === 'object' &&
           'nodeId' in inference &&
           'type' in inference;
  }

  static hasExpectedProperties(output, expectedProps) {
    if (!output || typeof output !== 'object') return false;
    return expectedProps.every(prop => prop in output);
  }
}


