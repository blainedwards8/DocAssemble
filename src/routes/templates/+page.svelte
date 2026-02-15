<script>
    import StructuresDashboard from "$lib/components/StructuresDashboard.svelte";
    import TopNav from "$lib/components/TopNav.svelte";
    import { goto } from "$app/navigation";

    function handleEditStructure(structure) {
        goto(`/templates/${structure.id}`);
    }

    function handleCreateStructure() {
        // Logic for creating a new structure
        // In the old app, this might have set a state to 'new'
        // For the new app, we can just navigate to a special 'new' id or just /templates/new
        goto("/templates/new");
    }
</script>

<div class="h-screen flex flex-col bg-slate-50 overflow-hidden">
    <TopNav />
    <main class="flex-1 overflow-hidden flex flex-col">
        <StructuresDashboard
            onEditStructure={handleEditStructure}
            onCreateStructure={handleCreateStructure}
        />
    </main>
</div>
