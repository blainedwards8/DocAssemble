<script>
    import MattersDashboard from "$lib/components/MattersDashboard.svelte";
    import TemplateSelectModal from "$lib/components/TemplateSelectModal.svelte";
    import TopNav from "$lib/components/TopNav.svelte";
    import { goto } from "$app/navigation";
    import { activeMatter } from "$lib/stores/app";
    import { pb } from "$lib/pocketbase";

    let isTemplateModalOpen = $state(false);

    function handleOpenDocument(doc, mode) {
        if (mode === "edit") {
            goto(`/edit/${doc.id}`);
        } else if (mode === "pdf") {
            alert("Exporting PDF...");
        } else if (mode === "docx") {
            alert("Exporting DOCX...");
        }
    }

    function handleNewDocument() {
        isTemplateModalOpen = true;
    }

    async function handleSelectTemplate(structure) {
        if (!$activeMatter) return;

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

            const payload = {
                title: structure.title,
                matter: $activeMatter.id,
                state: JSON.stringify(state),
                description: JSON.stringify(state),
            };

            const rec = await pb.collection("documents").create(payload);
            isTemplateModalOpen = false;
            goto(`/edit/${rec.id}`);
        } catch (err) {
            console.error("Failed to create document", err);
            alert("Failed to create document.");
        }
    }

    async function handleCreateMatter(matterData) {
        try {
            const record = await pb.collection("matters").create(matterData);
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

    <TemplateSelectModal
        isOpen={isTemplateModalOpen}
        onClose={() => (isTemplateModalOpen = false)}
        onSelect={handleSelectTemplate}
    />
</div>
