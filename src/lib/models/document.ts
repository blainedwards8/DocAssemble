import type { Matter } from "./matter";
import { pb } from "$lib/pocketbase.svelte";

export class Document {
    id: string;
    matter: Matter;
    title: string;
    description: string;
    created: string;
    updated: string;

    constructor(data: any) {
        this.id = data.id;
        this.matter = data.matter;
        this.title = data.title;
        this.description = data.description;
        this.created = data.created;
        this.updated = data.updated;
    }

    static async getAll(matterId: string) {
        const records = await pb.collection("documents").getFullList({
            filter: `matter="${matterId}"`,
            sort: "-created"
        });
        return records.map((record) => new Document(record));
    }

    static async get(id: string) {
        const record = await pb.collection("documents").getOne(id);
        return new Document(record);
    }

    static async create(data: any) {
        const record = await pb.collection("documents").create(data);
        return new Document(record);
    }

    static async update(id: string, data: any) {
        const record = await pb.collection("documents").update(id, data);
        return new Document(record);
    }

    static async delete(id: string) {
        await pb.collection("documents").delete(id);
    }

    static async getTemplate(id: string) {
        const record = await pb.collection("documents").getOne(id);
        return new Document(record);
    }
}