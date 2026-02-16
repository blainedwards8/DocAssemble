import { pb } from '$lib/pocketbase.svelte';
import { generateDocx, generatePdf } from '$lib/utils/export';
import { triggerSave, setNestedValue } from '$lib/utils/utils';

export class DocumentWorkspace {
    // --- PERSISTENT STATE ($state) ---
    rawTemplate = $state("");
    variables = $state<Record<string, any>>({});
    slotValues = $state<Record<string, any>>({});
    tierStyles = $state<string[]>([]);
    continuousNumbering = $state(true);
    variableConfigs = $state<Record<string, any>>({});
    structureTitle = $state("");
    structureId = $state<string | null>(null);
    activeDocumentId = $state("");
    activeMatterId = $state("");

    // --- SAVE STATUS ---
    saveStatus = $state<"idle" | "saving" | "saved" | "error">("idle");
    lastSaved = $state<Date | null>(null);

    constructor(data: any) {
        // Hydrate from SvelteKit load data
        const doc = data.document;
        const initialState = data.initialState || {};

        this.activeDocumentId = doc.id;
        this.activeMatterId = doc.matter;
        this.structureTitle = doc.title || "Untitled Document";

        // Initialize from the 'state' JSON stored in PocketBase
        this.rawTemplate = initialState.rawTemplate ?? "";
        this.variables = initialState.variables ?? {};
        this.slotValues = initialState.slotValues ?? {};
        this.tierStyles = initialState.tierStyles ?? ["decimal", "lower-alpha", "lower-roman"];
        this.continuousNumbering = initialState.continuousNumbering ?? true;
        this.variableConfigs = initialState.variableConfigs ?? {};
        this.structureId = initialState.structureId ?? null;
    }

    // --- DERIVED LOGIC ($derived) ---

    /**
     * Parses the raw template string into an array of static text and dynamic slots.
     */
    parsedTemplate = $derived.by(() => {
        const lines = this.rawTemplate.split("\n");
        const result: any[] = [];
        let currentStatic: string[] = [];
        const seenIds = new Map();

        lines.forEach((line) => {
            const slotMatch = line.match(/^\[\[(.*)\]\]$/);
            if (slotMatch) {
                // If there's accumulated static text, push it first
                if (currentStatic.length > 0) {
                    result.push({
                        id: `static-${result.length}`,
                        type: "static",
                        content: currentStatic.join("\n"),
                    });
                    currentStatic = [];
                }

                // Parse Slot metadata: [[Label | Category | Tag]]
                const parts = slotMatch[1].split("|");
                const label = parts[0] ? parts[0].trim() : "Untitled";
                const category = parts[1] ? parts[1].trim() : "General";
                const tag = parts[2] ? parts[2].trim() : null;

                // Generate a unique Slot ID
                const baseKey = `slot-${label}-${category}-${tag || "default"}`
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-");

                const count = seenIds.get(baseKey) || 0;
                seenIds.set(baseKey, count + 1);
                const slotId = `${baseKey}-${count}`;

                result.push({
                    id: slotId,
                    type: "slot",
                    label,
                    category,
                    tag,
                    value: this.slotValues[slotId] || null,
                });
            } else {
                currentStatic.push(line);
            }
        });

        // Final static block
        if (currentStatic.length > 0) {
            result.push({
                id: `static-${result.length}`,
                type: "static",
                content: currentStatic.join("\n"),
            });
        }
        return result;
    });

    /**
     * Extracts a unique list of variables detected within the template or provisions.
     */
    detectedVariables = $derived.by(() => {
        const vars = new Set<string>();
        // Regex for {variable.path}
        const varRegex = /\{([a-zA-Z0-9._]+)\}/g;

        // Scan the raw template
        let match;
        while ((match = varRegex.exec(this.rawTemplate)) !== null) {
            vars.add(match[1]);
        }

        // Scan the values currently in slots
        Object.values(this.slotValues).forEach(val => {
            if (typeof val === 'string') {
                while ((match = varRegex.exec(val)) !== null) {
                    vars.add(match[1]);
                }
            }
        });

        return Array.from(vars).sort();
    });

    // --- ACTIONS (Methods) ---

    /**
     * Saves the entire document state back to PocketBase.
     */
    async saveToCloud(isAutosave = false) {
        if (!this.activeDocumentId) return false;

        this.saveStatus = "saving";

        try {
            const stateToSave = {
                rawTemplate: this.rawTemplate,
                variables: $state.snapshot(this.variables), // snapshot creates a clean JSON copy
                slotValues: $state.snapshot(this.slotValues),
                tierStyles: this.tierStyles,
                continuousNumbering: this.continuousNumbering,
                variableConfigs: this.variableConfigs,
                structureTitle: this.structureTitle,
                structureId: this.structureId,
            };

            const payload = {
                state: JSON.stringify(stateToSave),
                // We keep description as a JSON string for easy previewing in admin UI
                description: JSON.stringify(stateToSave),
            };

            await pb.collection("documents").update(this.activeDocumentId, payload);

            this.saveStatus = "saved";
            this.lastSaved = new Date();

            if (!isAutosave) {
                // In SvelteKit/Browser context, alert is usually okay, 
                // but consider a custom toast in the future
                console.log("Document saved successfully");
            }
            return true;
        } catch (e) {
            console.error("Cloud save failed:", e);
            this.saveStatus = "error";
            return false;
        }
    }

    /**
     * Generates and triggers a download of the document.
     */
    async handleExport(format: 'docx' | 'pdf') {
        const filename = `${this.structureTitle || "Document"}_${Date.now()}`;

        try {
            // Helper to bundle arguments for export utilities
            const exportData = [
                this.parsedTemplate,
                $state.snapshot(this.variables),
                [], // sectionListOffsets (placeholders for now)
                this.continuousNumbering,
                this.tierStyles,
                [] // disabledSlots
            ];

            if (format === "docx") {
                const blob = await generateDocx(...(exportData as [any, any, any, any, any, any]));
                await triggerSave(
                    blob,
                    `${filename}.docx`,
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                );
            } else {
                const blob = await generatePdf(...(exportData as [any, any, any, any, any, any]));
                await triggerSave(blob, `${filename}.pdf`, "application/pdf");
            }
        } catch (e) {
            console.error("Export failed:", e);
        }
    }

    /**
     * Helper to update a variable nested deeply in the object.
     */
    updateVariable(path: string, value: any) {
        setNestedValue(this.variables, path, value);
    }
}