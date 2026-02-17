import { Document } from "$lib/models/document";
import { Matter } from "$lib/models/matter";

export const load = async ({ params }) => {
    let matterId = params.id;
    let activeMatter = await Matter.get(matterId);
    let documents = await Document.getAll(matterId);
    return { activeMatter, documents };
};