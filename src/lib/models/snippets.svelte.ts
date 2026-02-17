import { pb } from "$lib/pocketbase.svelte";

/**
 * The Snippet class manages the data and persistence for reusable
 * document provisions. It uses Svelte's $state for reactivity and 
 * aligns with the PocketBase 'snippets' collection schema.
 */
export class Snippet {
    id = $state("");
    title = $state("");
    content = $state("");
    tags = $state<string[]>([]);
    slots = $state<string[]>([]); // Associated slot names

    constructor(
        id: string,
        title: string,
        content: string,
        tags: string[] = [],
        slots: string[] = []
    ) {
        this.id = id;
        this.title = title;
        this.content = content;
        this.tags = tags;
        this.slots = slots;
    }

    /**
     * Persists the current state of the snippet to the 'snippets' collection.
     */
    async save(): Promise<boolean> {
        if (!this.id) return false;
        try {
            await pb.collection("snippets").update(this.id, {
                title: this.title,
                content: this.content,
                tags: this.tags,
                slots: this.slots
            });
            return true;
        } catch (error) {
            console.error("Error saving snippet:", error);
            return false;
        }
    }

    /**
     * Fetches all snippets from the collection.
     */
    static async getAll(): Promise<Snippet[]> {
        try {
            const records = await pb.collection("snippets").getFullList();
            return records.map(record => new Snippet(
                record.id,
                record.title,
                record.content,
                record.tags,
                record.slots
            ));
        } catch (error) {
            console.error("Error fetching snippets:", error);
            return [];
        }
    }

    /**
     * Creates a new snippet record in PocketBase.
     */
    static async create(title: string, content: string, tags: string[] = [], slots: string[] = []): Promise<Snippet> {
        try {
            const record = await pb.collection("snippets").create({
                title,
                content,
                tags,
                slots
            });
            return new Snippet(record.id, record.title, record.content, record.tags, record.slots);
        } catch (error) {
            console.error("Error creating snippet:", error);
            throw error;
        }
    }

    /**
     * Deletes a snippet record by ID.
     */
    static async delete(id: string): Promise<boolean> {
        try {
            await pb.collection("snippets").delete(id);
            return true;
        } catch (error) {
            console.error("Error deleting snippet:", error);
            return false;
        }
    }

    /**
     * Fetches a single snippet by ID.
     */
    static async get(id: string): Promise<Snippet | null> {
        try {
            const record = await pb.collection("snippets").getOne(id);
            return new Snippet(record.id, record.title, record.content, record.tags, record.slots);
        } catch (error) {
            console.error("Error fetching snippet:", error);
            return null;
        }
    }

    /**
     * Direct static update helper.
     */
    static async update(id: string, title: string, content: string, tags: string[] = [], slots: string[] = []): Promise<boolean> {
        try {
            await pb.collection("snippets").update(id, {
                title,
                content,
                tags,
                slots
            });
            return true;
        } catch (error) {
            console.error("Error updating snippet:", error);
            return false;
        }
    }
}