import { Matter } from "$lib/models/matter";

export async function load() {
    const matters = await Matter.getAll();
    return { matters };
}