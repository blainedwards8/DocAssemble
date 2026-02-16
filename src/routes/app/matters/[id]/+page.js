import {pb} from "$lib/pocketbase.svelte";

export const load = async ({params}) => {
    let matterId = params.id;
    let activeMatter = await pb.collection("matters").getOne(matterId);
    let documents = await pb.collection("documents").getFullList({
        filter: `matter="${matterId}"`,
        sort: "-created"
    })

    return {activeMatter,documents};
};