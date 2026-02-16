<script>
    import { page } from "$app/stores";
    import StructureEditor from "$lib/components/StructureEditor.svelte";
    import TopNav from "$lib/components/TopNav.svelte";
    import { structures, snippets, variableConfigs } from "$lib/stores/app";
    import { pb } from "$lib/pocketbase";
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";

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
            variableConfigs.set({}); // Clear for new
            loading = false;
        } else {
            // Always fetch fresh from PB to ensure we have the 'state' field and latest configs
            try {
                const record = await pb.collection("templates").getOne(id);
                structure = record;
                // Restore variableConfigs from state
                if (record.state) {
                    try {
                        const parsed = JSON.parse(record.state);
                        if (parsed.variableConfigs) {
                            variableConfigs.set(parsed.variableConfigs);
                        }
                    } catch (e) {
                        console.error("Failed to parse template state", e);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch structure", err);
                // Fallback to store if PB fails
                const found = $structures.find((s) => s.id === id);
                if (found) structure = { ...found };
            } finally {
                loading = false;
            }
        }
    });

    function handleBack() {
        goto("/templates");
    }

    function handleSave(rec) {
        alert("Template saved!");
        if (structure.isNew) {
            goto(`/templates/${rec.id}`, { replaceState: true });
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
            <StructureEditor
                initialStructure={structure}
                snippets={$snippets}
                variableConfigs={$variableConfigs}
                onUpdateSnippets={(s) => snippets.set(s)}
                onUpdateVariableConfigs={(c) => variableConfigs.set(c)}
                onBack={handleBack}
                onSave={handleSave}
            />
        {:else}
            <div class="flex-1 flex items-center justify-center">
                <p class="text-red-500 font-bold">Structure not found.</p>
            </div>
        {/if}
    </main>
</div>
