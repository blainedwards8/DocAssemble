import { writable } from 'svelte/store';

// Authentication & User
export const user = writable(null);

// Navigation & View Mode
export const viewMode = writable('dashboard'); // 'dashboard', 'assemble', 'blueprint', 'structures-dashboard'
export const activeTab = writable(null);
export const activeMatter = writable(null);

// Document State
export const activeDocumentId = writable(null);
export const rawTemplate = writable("");
export const structureTitle = writable("Untitled Structure");
export const structureId = writable(null);

// Data Workstation
export const variables = writable({});
export const variableConfigs = writable({});
export const slotValues = writable({});

// Logic State
export const snippets = writable([]);
export const structures = writable([]);
export const matters = writable([]);
export const disabledSlots = writable(new Set());

// Persistent Logic
export const tierStyles = writable(['decimal', 'lower-alpha', 'lower-roman']);
export const continuousNumbering = writable(true);
