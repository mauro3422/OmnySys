/**
 * @fileoverview molecular-chains-test.constants.js
 * 
 * Test Constants
 * 
 * @module tests/factories/molecular-chains-constants
 */

export const MolecularChainsTestConstants = {
    CHAIN_TYPES: {
        LINEAR: 'linear',
        BRANCHING: 'branching',
        CONVERGING: 'converging',
        DIAMOND: 'diamond',
        CIRCULAR: 'circular'
    },

    NODE_TYPES: {
        ENTRY: 'entry',
        EXIT: 'exit',
        INTERMEDIATE: 'intermediate',
        ISOLATED: 'isolated'
    },

    EDGE_TYPES: {
        DIRECT_CALL: 'direct_call',
        DATA_TRANSFORM: 'data_transform',
        CALL: 'call',
        RETURN_FLOW: 'return_flow'
    },

    TRANSFORM_TYPES: {
        DIRECT_PASS: 'DIRECT_PASS',
        MAP: 'MAP',
        FILTER: 'FILTER',
        REDUCE: 'REDUCE',
        PARSE: 'PARSE',
        VALIDATE: 'VALIDATE',
        TRANSFORM: 'TRANSFORM'
    }
};
