import { pb } from '$lib/pocketbase.svelte';
import type { Templates } from '$lib/types';

export class TemplatesWorkspace {
    // --- STATE ---
    templates = $state<Templates[]>([]);
    loading = $state(false);

    constructor() { }

    // --- ACTIONS ---

    async loadTemplates() {
        if (this.templates.length > 0) return;

        this.loading = true;
        try {
            // Fetch all templates, sorted by title
            this.templates = await pb.collection('templates').getFullList({
                sort: 'title',
            });
        } catch (e) {
            console.error("Failed to load templates", e);
        } finally {
            this.loading = false;
        }
    }
}
