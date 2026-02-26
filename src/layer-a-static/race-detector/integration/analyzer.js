import { RaceConditionDetector } from '../index.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:integration');

export async function analyzeProjectRaces(projectData) {
    logger.info('[RaceDetector] Analyzing project for race conditions...');
    const detector = new RaceConditionDetector(projectData);
    const results = detector.detect();
    logger.info(`[RaceDetector] Found ${results.races.length} races, ${results.warnings.length} warnings`);
    return results;
}

export function enrichProjectWithRaces(projectData, raceResults) {
    if (!projectData) {
        return {
            raceConditions: raceResults,
            _meta: {
                raceDetectionVersion: '4.0.0',
                raceAnalysisAt: new Date().toISOString()
            }
        };
    }
    return {
        ...projectData,
        raceConditions: raceResults,
        _meta: {
            ...projectData._meta,
            raceDetectionVersion: '4.0.0',
            raceAnalysisAt: new Date().toISOString()
        }
    };
}
