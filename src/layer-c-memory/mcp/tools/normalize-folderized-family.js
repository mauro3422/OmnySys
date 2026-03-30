import { rename_folderized_family } from './rename-folderized-family.js';

/**
 * Canonical standalone entrypoint for folderized-name normalization.
 *
 * This keeps the move tool family useful even when the folder structure already
 * exists and only basename normalization is needed.
 */
export async function normalize_folderized_family_names(args, context) {
  return rename_folderized_family(args, context);
}

export default { normalize_folderized_family_names };
