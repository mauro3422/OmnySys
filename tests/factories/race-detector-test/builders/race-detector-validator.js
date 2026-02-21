/**
 * @fileoverview Race Detector Validator
 * Validation helpers for race detector results
 */

export class RaceDetectorValidator {
  static isValidRace(race) {
    return race && 
           typeof race === 'object' &&
           'id' in race &&
           'type' in race &&
           'severity' in race &&
           'accesses' in race &&
           Array.isArray(race.accesses) &&
           race.accesses.length >= 2;
  }

  static isValidAccess(access) {
    return access &&
           typeof access === 'object' &&
           'atom' in access &&
           'type' in access;
  }

  static isValidMitigation(mitigation) {
    return mitigation &&
           typeof mitigation === 'object' &&
           'type' in mitigation;
  }

  static hasReadWritePattern(race) {
    if (!race.accesses || race.accesses.length < 2) return false;
    const types = race.accesses.map(a => a.type);
    return types.includes('read') && types.includes('write');
  }

  static hasWriteWritePattern(race) {
    if (!race.accesses || race.accesses.length < 2) return false;
    return race.accesses.every(a => a.type === 'write');
  }

  static getRaceSeverityRank(severity) {
    const ranks = { low: 1, medium: 2, high: 3, critical: 4 };
    return ranks[severity] || 0;
  }
}
