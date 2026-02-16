import { pb } from "$lib/pocketbase.svelte";

export const load = async () => {
    try {

        const templates = await pb
            .collection("templates")
            .getFullList({ sort: "title" });
        const items = templates.map((t) => ({
            id: t.id,
            category: t.category,
            title: t.title,
            content: t.content,
            state: t.state || t.description,
            tag: Array.isArray(t.tags) ? t.tags[0] || "" : t.tags || "",
        }));

        const matters = await pb
            .collection("matters")
            .getFullList({ sort: "-created" });

        return { structures: [], snippets: [], templates: items, matters };
    } catch (err) {
        console.error("Error loading PB data", err);
    }
}