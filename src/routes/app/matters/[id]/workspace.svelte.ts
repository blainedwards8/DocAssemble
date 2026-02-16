import { goto } from '$app/navigation';
import { pb } from '$lib/pocketbase.svelte';
import type { Matters, Documents, Templates } from '$lib/types';

export class MatterWorkspace {
    // --- STATE ---
    activeMatter = $state<Matters | null>(null);
    documents = $state<Documents[]>([]);

    // Modal State
    isModalOpen = $state(false);
    templates = $state<Templates[]>([]);
    searchTerm = $state("");
    selectedTemplate = $state<Templates | null>(null);
    loadingTemplates = $state(false);
    creating = $state(false);

    constructor(data: { activeMatter: Matters, documents: Documents[] }) {
        this.activeMatter = data.activeMatter;
        this.documents = data.documents || [];
    }

    // --- ACTIONS ---

    async loadTemplates() {
        if (this.templates.length > 0) return;

        this.loadingTemplates = true;
        try {
            // Fetch all templates, sorted by title
            this.templates = await pb.collection('templates').getFullList({
                sort: 'title',
            });
        } catch (e) {
            console.error("Failed to load templates", e);
        } finally {
            this.loadingTemplates = false;
        }
    }

    openNewDocumentModal() {
        this.isModalOpen = true;
        this.loadTemplates();
    }

    closeModal() {
        this.isModalOpen = false;
        this.selectedTemplate = null;
        this.searchTerm = "";
    }

    selectTemplate(template: Templates) {
        this.selectedTemplate = template;
    }

    async createDocument() {
        if (!this.selectedTemplate || !this.activeMatter) return;

        this.creating = true;
        try {
            // Prepare initial state for the document based on the template
            // The editor expects state.rawTemplate to be the markdown content
            const state = {
                rawTemplate: this.selectedTemplate.content || "",
                structureId: this.selectedTemplate.id,
                structureTitle: this.selectedTemplate.title,
                // If template has variableConfigs (it might be in 'state' or 'content' depending on schema, 
                // but usually likely stored in a separate field or parsed. 
                // For now, we'll try to check if template has a 'state' field with configs)
                variableConfigs: this.selectedTemplate.state ? JSON.parse(this.selectedTemplate.state)?.variableConfigs : {}
            };

            // If template has specific description, use it, otherwise use state as description (editor pattern)
            const description = this.selectedTemplate.description || JSON.stringify(state);

            const payload = {
                title: this.selectedTemplate.title,
                matter: this.activeMatter.id,
                state: JSON.stringify(state),
                description: description,
                // Copy other fields if necessary?
            };

            const newDoc = await pb.collection('documents').create(payload);

            // Redirect to the editor
            goto(`/app/edit/${newDoc.id}`);

        } catch (e) {
            console.error("Failed to create document", e);
            alert("Failed to create document. Please try again.");
        } finally {
            this.creating = false;
            this.closeModal(); // Close modal on error or success (success redirects anyway)
        }
    }

    // --- DERIVED ---
    get filteredTemplates() {
        if (!this.searchTerm) return this.templates;
        const lower = this.searchTerm.toLowerCase();
        return this.templates.filter((t: Templates) =>
            (t.title && t.title.toLowerCase().includes(lower)) ||
            (t.category && t.category.toLowerCase().includes(lower))
        );
    }
}
