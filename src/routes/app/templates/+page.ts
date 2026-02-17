import { Template } from "$lib/models/template.svelte";

export async function load() {
    const templates = await Template.getAll();
    return { templates };
}
