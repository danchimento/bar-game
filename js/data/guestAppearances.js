/**
 * Guest appearance IDs — single source of truth for the game runtime.
 * Must match the IDs in scripts/guest-appearances.js.
 * Add entries here + in guest-appearances.js to add new looks.
 */
export const GUEST_APPEARANCE_IDS = ['blue', 'red', 'green'];

/** Total number of distinct guest looks */
export const GUEST_APPEARANCE_COUNT = GUEST_APPEARANCE_IDS.length;
