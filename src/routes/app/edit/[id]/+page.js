import { pb } from "$lib/pocketbase.svelte";
import { error } from "@sveltejs/kit";

export const load = async ({ params }) => {
    try {
        let activeMatter, stateData, state;

        const doc = await pb.collection("documents").getOne(params.id, {
            expand: "matter"
        });

        const snippets = await pb.collection("templates").getFullList({
            filter:`category="Structure"`
        })

        if(doc.expand?.matter) {
            activeMatter = doc.expand.matter;            
        }

        stateData = doc.state || doc.description;
        if (stateData) {
            if (
                typeof stateData === "string" &&
                (stateData.startsWith("{") || stateData.startsWith("["))
            ) {
                state = JSON.parse(stateData);
            } else if (typeof stateData === "object") {
                state = stateData;
            }
        }

        return {
            activeMatter,
            snippets,
            document: doc,
            initialState: state,
        }
    } catch (err) {
        console.error("Failed to load document", err);
        throw error(404, "Document not found");
    }
};