import { writable } from 'svelte/store';

// Authentication & User
/** @type {import('svelte/store').Writable<any>} */
export const user = writable(null);

// Navigation & View Mode
export const viewMode = writable('dashboard'); // 'dashboard', 'assemble', 'blueprint', 'structures-dashboard'
export const activeTab = writable(null);
/** @type {import('svelte/store').Writable<any>} */
export const activeMatter = writable(null);

// Document State
/** @type {import('svelte/store').Writable<any>} */
export const activeDocumentId = writable(null);
export const rawTemplate = writable("");
export const structureTitle = writable("Untitled Structure");
export const structureId = writable(null);

// Data Workstation
/** @type {import('svelte/store').Writable<any>} */
export const variables = writable({});
/** @type {import('svelte/store').Writable<any>} */
export const variableConfigs = writable({});
/** @type {import('svelte/store').Writable<any>} */
export const slotValues = writable({});

// Logic State
/** @type {import('svelte/store').Writable<any[]>} */
export const snippets = writable([]);
/** @type {import('svelte/store').Writable<any[]>} */
export const structures = writable([]);
/** @type {import('svelte/store').Writable<any[]>} */
export const matters = writable([]);
export const disabledSlots = writable(new Set());

// Persistent Logic
export const tierStyles = writable(['decimal', 'lower-alpha', 'lower-roman']);
export const continuousNumbering = writable(true);
