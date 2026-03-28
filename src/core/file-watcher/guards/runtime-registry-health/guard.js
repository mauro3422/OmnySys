import { detectRuntimeRegistryHealth as detectRuntimeRegistryHealthImpl } from './core.js';
import {
    getRuntimeRegistryHealthStats as getRuntimeRegistryHealthStatsImpl,
    resetRegistryStats as resetRegistryStatsImpl
} from './stats.js';

export const detectRuntimeRegistryHealth = detectRuntimeRegistryHealthImpl;
export const getRuntimeRegistryHealthStats = getRuntimeRegistryHealthStatsImpl;
export const resetRegistryStats = resetRegistryStatsImpl;

export default detectRuntimeRegistryHealth;
