<script>
    import { page } from "$app/stores";
    import StructureEditor from "$lib/components/StructureEditor.svelte";
    import TopNav from "$lib/components/TopNav.svelte";
    import { structures } from "$lib/stores/app";
    import { pb } from "$lib/pocketbase";
    import { onMount } from "svelte";

    let structure = $state(null);
    let loading = $state(true);

    onMount(async () => {
        const id = $page.params.id;
        if (id === "new") {
            structure = {
                title: "New Template",
                content: "",
                variables: [],
                provisions: [],
                isNew: true,
            };
            loading = false;
        } else {
            // Find in store first if available
            const found = $structures.find((s) => s.id === id);
            if (found) {
                structure = { ...found };
                loading = false;
            } else {
                // Fetch from PB
                try {
                    const record = await pb.collection("structures").getOne(id);
                    structure = record;
                } catch (err) {
                    console.error("Failed to fetch structure", err);
                } finally {
                    loading = false;
                }
            }
        }
    });

    async function handleSave(updatedStructure) {
        try {
            if (updatedStructure.isNew) {
                const { isNew, ...data } = updatedStructure;
                await pb.collection("structures").create(data);
            } else {
                await pb
                    .collection("structures")
                    .update(updatedStructure.id, updatedStructure);
            }
            alert("Structure saved successfully!");
        } catch (err) {
            console.error("Failed to save structure", err);
            alert("Failed to save structure.");
        }
    }
</script>

<div class="h-screen flex flex-col bg-slate-50 overflow-hidden">
    <TopNav />
    <main class="flex-1 overflow-hidden flex flex-col">
        {#if loading}
            <div class="flex-1 flex items-center justify-center">
                <p class="text-slate-400 font-bold animate-pulse">
                    Loading editor...
                </p>
            </div>
        {:else if structure}
            <StructureEditor initialStructure={structure} onSave={handleSave} />
        {:else}
            <div class="flex-1 flex items-center justify-center">
                <p class="text-red-500 font-bold">Structure not found.</p>
            </div>
        {/if}
    </main>
</div>
