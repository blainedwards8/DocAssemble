<script>
    import StructuresDashboard from "$lib/components/StructuresDashboard.svelte";
    import { goto } from "$app/navigation";
    import { TemplatesWorkspace } from "./workspace.svelte.js";

    const workspace = new TemplatesWorkspace();

    $effect(() => {
        workspace.loadTemplates();
    });

    function handleEditStructure(structure) {
        goto(`/app/templates/${structure.id}`);
    }

    function handleCreateStructure() {
        goto("/app/templates/new"); // Assuming this route exists or will be created
    }
</script>

<div class="h-screen flex flex-col bg-slate-50 overflow-hidden">
    <main class="flex-1 overflow-hidden flex flex-col">
        <StructuresDashboard
            structures={workspace.templates}
            onEditStructure={handleEditStructure}
            onCreateStructure={handleCreateStructure}
        />
    </main>
</div>
