<script>
    import MattersDashboard from "$lib/components/MattersDashboard.svelte";
    import TopNav from "$lib/components/TopNav.svelte";
    import { goto } from "$app/navigation";
    import { activeMatter } from "$lib/stores/app";
    import { pb } from "$lib/pocketbase";

    function handleOpenDocument(doc, mode) {
        if (mode === "edit") {
            goto(`/edit/${doc.id}`);
        } else if (mode === "pdf") {
            // Placeholder for PDF export
            alert("Exporting PDF...");
        } else if (mode === "docx") {
            // Placeholder for DOCX export
            alert("Exporting DOCX...");
        }
    }

    function handleNewDocument() {
        // This usually triggers a template selection modal in the old app.
        // For now, we'll redirect to templates to select one.
        goto("/templates");
    }

    async function handleCreateMatter(matterData) {
        try {
            const record = await pb.collection("matters").create(matterData);
            // Stores are reactive, so we don't necessarily need to do anything here
            // if we have a subscription elsewhere, but let's set it as active
            activeMatter.set(record);
        } catch (err) {
            console.error("Failed to create matter", err);
        }
    }
</script>

<div class="h-screen flex flex-col bg-slate-50 overflow-hidden">
    <TopNav />
    <main class="flex-1 overflow-hidden flex flex-col">
        <MattersDashboard
            onOpenDocument={handleOpenDocument}
            onNewDocument={handleNewDocument}
            onCreateMatter={handleCreateMatter}
        />
    </main>
</div>
