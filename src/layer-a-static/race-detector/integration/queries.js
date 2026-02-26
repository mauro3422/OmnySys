export function getRacesByModule(moduleName, raceResults) {
    if (!raceResults || !raceResults.races) return [];
    return raceResults.races.filter(race =>
        race.accesses.some(access => access.module === moduleName)
    );
}

export function getRacesByFile(filePath, raceResults) {
    if (!raceResults || !raceResults.races) return [];
    return raceResults.races.filter(race =>
        race.accesses.some(access => access.file === filePath)
    );
}

export function getRacesByFunction(atomId, raceResults) {
    if (!raceResults || !raceResults.races) return [];
    return raceResults.races.filter(race =>
        race.accesses.some(access => access.atom === atomId)
    );
}
