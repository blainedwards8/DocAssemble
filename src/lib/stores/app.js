import { pb } from '$lib/pocketbase.svelte';

/**
 * @typedef {import('$lib/types').Templates} Template
 * @typedef {import('$lib/types').Structures} Structure
 */

/*
 * @type {{
 *  structures: Structure[],
 *  snippets: any[],
 *  variableConfigs: any[]
 * }}
 */
// compatibility layer for Svelte 5 migration

// However, for Svelte 5, the standard store contract (subscribe) is still supported.
// But to make it reactive with runes, we might want to just use standard writable stores
// OR use runes and expose them.
// Given the components use `$structures`, they expect a store.
// Let's implement a minimal store that wraps the state.

import { writable } from 'svelte/store';

export const user = writable(pb.authStore.model);

pb.authStore.onChange((token, model) => {
    user.set(model);
});


/** @type {import('svelte/store').Writable<import('$lib/types').Templates[]>} */
export const structures = writable([]);

/** @type {import('svelte/store').Writable<import('$lib/types').Snippets[]>} */
export const snippets = writable([]);

/** @type {import('svelte/store').Writable<Record<string, any>>} */
export const variableConfigs = writable({});

export const activeMatter = writable(null);
export const viewMode = writable('assemble');
export const rawTemplate = writable('');
export const activeDocumentId = writable(null);
export const disabledSlots = writable([]);
export const docState = writable({});
