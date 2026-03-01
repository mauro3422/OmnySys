import { SYSTEM_STATE } from './test-folder/retest-dummy.js';

export function checkSystemHealth() {
    console.log(`Current state: ${SYSTEM_STATE}`);
    if (SYSTEM_STATE === "VERIFIED_ACTIVE_AND_EDITED_SUCCESSFULLY") {
        return true;
    }
    return false;
}

export const DUMMY_CONSTANT = 42;
