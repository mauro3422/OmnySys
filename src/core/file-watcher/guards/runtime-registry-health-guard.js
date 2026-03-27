import { detectRuntimeRegistryHealth as detectRuntimeRegistryHealthImpl } from './runtime-registry-health-core.js';
import {
    getRuntimeRegistryHealthStats as getRuntimeRegistryHealthStatsImpl,
    resetRegistryStats as resetRegistryStatsImpl
} from './runtime-registry-health-stats.js';

export const detectRuntimeRegistryHealth = detectRuntimeRegistryHealthImpl;
export const getRuntimeRegistryHealthStats = getRuntimeRegistryHealthStatsImpl;
export const resetRegistryStats = resetRegistryStatsImpl;

export default detectRuntimeRegistryHealth;
