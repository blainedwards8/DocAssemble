<script>
    import ProvisionEditorModal from "$lib/components/ProvisionEditorModal.svelte";
    import Icon from "$lib/components/Icon.svelte";
    import { Template } from "$lib/models/template.svelte";
</script>

<div class="h-screen flex flex-col bg-slate-50 overflow-hidden">
    <main class="flex-1 overflow-hidden flex flex-col">
        <div class="flex items-center justify-between p-4 border-b">
            <h1 class="text-2xl font-bold">Structure Editor</h1>
            <button class="btn btn-primary" onclick={handleSave}>Save</button>
        </div>
        <div class="p-4"></div>
    </main>
</div>
