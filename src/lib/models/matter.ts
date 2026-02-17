import { pb } from "$lib/pocketbase.svelte";

export class Matter {
    id: string;
    title: string;
    case_number: string;
    description: string;
    status: string;
    created: string;
    updated: string;
    caseType: string;

    constructor(data: any) {
        this.id = data.id;
        this.title = data.title;
        this.case_number = data.case_number;
        this.description = data.description;
        this.status = data.status;
        this.created = data.created;
        this.updated = data.updated;
        this.caseType = data.case_type;
    }

    static async getAll() {
        const records = await pb.collection("matters").getFullList({ sort: "-created" });
        return records.map((record) => new Matter(record));
    }

    static async get(id: string) {
        const record = await pb.collection("matters").getOne(id);
        return new Matter(record);
    }

    static async create(data: any) {
        const record = await pb.collection("matters").create(data);
        return new Matter(record);
    }

    static async update(id: string, data: any) {
        const record = await pb.collection("matters").update(id, data);
        return new Matter(record);
    }

    static async delete(id: string) {
        await pb.collection("matter").delete(id);
    }
}