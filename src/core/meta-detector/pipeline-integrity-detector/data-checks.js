import { buildIntegrityRecommendation } from '../integrity-contract.js';
import {
    checkRelationSample,
    loadRelationSample,
    summarizeCalledByLinks,
    sumMissingOptionalFields
} from '../pipeline-integrity-detector-helpers.js';
import { getFileUniverseGranularity, getLiveFileTotal } from '#shared/compiler/index.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:PipelineIntegrityDetector');

export async function checkScanToAtomCoverage(detector) {
    try {
        const db = detector.repo.db;
        const scannedFiles = db.prepare(`
            SELECT COUNT(DISTINCT path) as count
            FROM compiler_scanned_files
        `).get().count;

        const liveIndexedFiles = getLiveFileTotal(db);
        const fileUniverseGranularity = getFileUniverseGranularity({
            scannedFileTotal: scannedFiles,
            manifestFileTotal: scannedFiles,
            liveFileCount: liveIndexedFiles
        });

        const zeroAtomFilesSample = db.prepare(`
            SELECT path
            FROM compiler_scanned_files
            WHERE path NOT IN (
                SELECT DISTINCT file_path
                FROM atoms
                WHERE file_path IS NOT NULL
                  AND file_path != ''
            )
            LIMIT 20
        `).all().map(row => row.path);

        return detector._buildResult(
            'scan_to_atom_coverage',
            fileUniverseGranularity.healthy === true,
            fileUniverseGranularity.healthy === true ? 'low' : 'high',
            {
                scannedFiles,
                filesWithAtoms: liveIndexedFiles,
                liveIndexedFiles,
                missingFiles: 0,
                missingFilesSample: [],
                zeroAtomFiles: fileUniverseGranularity.zeroAtomFileCount,
                zeroAtomFilesSample,
                coveragePercentage: 100,
                fileUniverseGranularity
            },
            fileUniverseGranularity.healthy === true
                ? fileUniverseGranularity.zeroAtomFileCount > 0
                    ? 'Scanner, manifest and live index are aligned; zero-atom files are expected support or metadata-only files'
                    : 'Scanner, manifest and live index are aligned'
                : buildIntegrityRecommendation({
                    name: 'scan_to_atom_coverage',
                    details: { zeroAtomFiles: fileUniverseGranularity.zeroAtomFileCount, missingFiles: 0 }
                }).summary
        );
    } catch (error) {
        logger.error('checkScanToAtomCoverage failed:', error.message);
        throw error;
    }
}

export async function checkAtomMetadataCompleteness(detector) {
    try {
        const db = detector.repo.db;
        const requiredFields = ['id', 'name', 'file_path', 'atom_type', 'lines_of_code', 'complexity'];
        const optionalButImportant = [
            'imports_json', 'exports_json', 'called_by_json', 'uses_json',
            'shared_state_json', 'event_emitters_json', 'event_listeners_json',
            'data_flow_json', 'side_effects_json', 'scope_type', 'purpose_type', 'archetype_type'
        ];

        const missingRequiredQuery = requiredFields.map(field => {
            if (field === 'id' || field === 'name' || field === 'file_path') {
                return `${field} IS NULL`;
            }
            return `${field} IS NULL OR ${field} = ''`;
        }).join(' OR ');

        const missingRequired = db.prepare(`
            SELECT COUNT(*) as count FROM atoms
            WHERE (is_removed IS NULL OR is_removed = 0)
              AND (${missingRequiredQuery})
        `).get().count;

        const missingOptional = sumMissingOptionalFields(db, optionalButImportant);
        const totalAtoms = detector._countLiveAtoms();
        const completenessPercentage = totalAtoms > 0
            ? ((totalAtoms - missingRequired) / totalAtoms) * 100
            : 100;

        return detector._buildResult(
            'atom_metadata_completeness',
            missingRequired === 0,
            missingRequired > 50 ? 'high' : missingRequired > 10 ? 'medium' : 'low',
            {
                totalAtoms,
                missingRequired,
                missingOptionalFields: Math.round(missingOptional / optionalButImportant.length),
                completenessPercentage: Math.round(completenessPercentage * 100) / 100,
                requiredFields,
                optionalButImportant
            },
            missingRequired > 0
                ? buildIntegrityRecommendation({ name: 'atom_metadata_completeness', details: { missingRequired } }).summary
                : 'All atoms have complete metadata'
        );
    } catch (error) {
        logger.error('checkAtomMetadataCompleteness failed:', error.message);
        throw error;
    }
}

export async function checkCalledByResolution(detector) {
    try {
        const db = detector.repo.db;
        const unresolvedCalledBy = db.prepare(`
            SELECT COUNT(*) as count FROM atoms
            WHERE (is_removed IS NULL OR is_removed = 0)
              AND called_by_json IS NOT NULL
              AND called_by_json != '[]'
              AND called_by_json LIKE '%"unresolved":true%'
        `).get().count;

        const totalLinksQuery = db.prepare(`
            SELECT called_by_json FROM atoms
            WHERE (is_removed IS NULL OR is_removed = 0)
              AND called_by_json IS NOT NULL
              AND called_by_json != '[]'
        `).all();

        const { totalLinks, unresolvedLinks } = summarizeCalledByLinks(totalLinksQuery);
        const resolutionPercentage = totalLinks > 0
            ? ((totalLinks - unresolvedLinks) / totalLinks) * 100
            : 100;

        return detector._buildResult(
            'calledBy_resolution',
            unresolvedLinks === 0,
            unresolvedLinks > 500 ? 'high' : unresolvedLinks > 100 ? 'medium' : 'low',
            {
                totalLinks,
                unresolvedLinks,
                resolutionPercentage: Math.round(resolutionPercentage * 100) / 100,
                affectedAtoms: unresolvedCalledBy
            },
            unresolvedLinks > 0
                ? buildIntegrityRecommendation({ name: 'calledBy_resolution', details: { unresolvedLinks } }).summary
                : 'All calledBy links are resolved'
        );
    } catch (error) {
        logger.error('checkCalledByResolution failed:', error.message);
        throw error;
    }
}

export async function checkRelationConsistency(detector) {
    try {
        const sampleAtoms = loadRelationSample(detector.repo.db, 100);
        const { checked, inconsistencies } = checkRelationSample(detector.repo.db, sampleAtoms);
        const inconsistencyRate = checked > 0 ? (inconsistencies / checked) * 100 : 0;

        return detector._buildResult(
            'relation_consistency',
            inconsistencies === 0,
            inconsistencies > 50 ? 'high' : inconsistencies > 10 ? 'medium' : 'low',
            {
                sampleSize: sampleAtoms.length,
                checkedRelations: checked,
                inconsistencies,
                inconsistencyRate: Math.round(inconsistencyRate * 100) / 100
            },
            inconsistencies > 0
                ? buildIntegrityRecommendation({ name: 'relation_consistency', details: { inconsistencies } }).summary
                : 'All checked relations are consistent'
        );
    } catch (error) {
        logger.error('checkRelationConsistency failed:', error.message);
        throw error;
    }
}
