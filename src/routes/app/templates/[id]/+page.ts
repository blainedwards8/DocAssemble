import { Template } from "$lib/models/template.svelte";

export async function load({ params }) {
    const id = params.id;

    const template = await Template.get(id);

    return { template };
}