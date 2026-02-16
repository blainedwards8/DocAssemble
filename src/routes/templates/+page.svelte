<script>
    import StructuresDashboard from "$lib/components/StructuresDashboard.svelte";
    import TopNav from "$lib/components/TopNav.svelte";
    import { goto } from "$app/navigation";
    import { activeMatter } from "$lib/stores/app";
    import { pb } from "$lib/pocketbase";

    function handleEditStructure(structure) {
        goto(`/templates/${structure.id}`);
    }

    async function handleUseStructure(structure) {
        if ($activeMatter) {
            try {
                const state = {
                    rawTemplate: structure.content,
                    structureId: structure.id,
                    structureTitle: structure.title,
                    variables: {},
                    slotValues: {},
                    tierStyles: ["decimal", "lower-alpha", "lower-roman"],
                    continuousNumbering: true,
                    variableConfigs: {},
                };

                const formData = new FormData();
                formData.append("title", structure.title);
                formData.append("matter", $activeMatter.id);
                formData.append("state", JSON.stringify(state));
                formData.append("description", JSON.stringify(state));

                const rec = await pb.collection("documents").create(formData);
                goto(`/edit/${rec.id}`);
            } catch (err) {
                console.error("Failed to create document", err);
                alert("Failed to create document.");
            }
        } else {
            // If no matter is active, maybe we just edit the template?
            // Or ask to select a matter first.
            goto(`/templates/${structure.id}`);
        }
    }

    function handleStructureClick(structure) {
        if ($activeMatter) {
            handleUseStructure(structure);
        } else {
            handleEditStructure(structure);
        }
    }
    function handleCreateStructure() {
        goto("/templates/new");
    }
</script>

<div class="h-screen flex flex-col bg-slate-50 overflow-hidden">
    <TopNav />
    <main class="flex-1 overflow-hidden flex flex-col">
        <StructuresDashboard
            onEditStructure={handleStructureClick}
            onCreateStructure={handleCreateStructure}
        />
    </main>
</div>
