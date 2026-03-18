/**
 * @fileoverview FileProcessingHelper.js
 * 
 * Canonical helper for the 'with_file' pattern.
 * Provides a standardized way to read, transform, and write files
 * with atomic safety and atom-graph synergy.
 * 
 * @module shared/compiler/helpers/FileProcessingHelper
 */

import fs from 'fs/promises';
import { getAtomCode } from '../atom-utils.js';

/**
 * Common file processing wrapper.
 * 
 * @param {string} filePath - Absolute path to the file.
 * @param {Function} processor - Async function (content, context) => newContent.
 * @param {Object} options - Processing options.
 * @returns {Promise<{success: boolean, changed: boolean, error?: string}>}
 */
export async function withFile(filePath, processor, options = {}) {
    try {
        const { encoding = 'utf8', dryRun = false } = options;
        
        // 1. Read
        const originalContent = await fs.readFile(filePath, encoding);
        
        // 2. Process
        const context = { filePath, ...options };
        const newContent = await processor(originalContent, context);
        
        if (originalContent === newContent) {
            return { success: true, changed: false };
        }
        
        // 3. Write (unless dryRun)
        if (!dryRun) {
            await fs.writeFile(filePath, newContent, encoding);
        }
        
        return { success: true, changed: true };
    } catch (error) {
        return { 
            success: false, 
            changed: false, 
            error: error.message 
        };
    }
}

/**
 * Process a file using its atom representation if available.
 * 
 * @param {Object} atom - The atom object from the graph.
 * @param {Function} processor - Async function (code, atom) => newCode.
 */
export async function withAtomFile(atom, processor, options = {}) {
    if (!atom?.filePath) {
        throw new Error('Atom must have a filePath to be processed via withFile');
    }
    
    return withFile(atom.filePath, (content) => processor(content, atom), options);
}
