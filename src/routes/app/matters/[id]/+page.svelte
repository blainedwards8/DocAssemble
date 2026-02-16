<script>
    import { goto } from "$app/navigation";
    import Icon from "$lib/components/Icon.svelte";
    import { MatterWorkspace } from "./workspace.svelte.js";

    let { data } = $props();
    const workspace = new MatterWorkspace(data);

    function editDocument(id) {
        goto(`/app/edit/${id}`);
    }
</script>

<div class="p-8 max-w-[1600px] mx-auto">
    <!-- Header -->
    <div class="flex justify-between items-center mb-10">
        <div>
            <div
                class="flex items-center gap-3 text-slate-400 font-bold text-xs uppercase tracking-widest mb-2"
            >
                <a
                    href="/app/dashboard"
                    class="hover:text-indigo-600 transition-colors">Matters</a
                >
                <Icon name="ChevronRight" size={12} />
                <span class="text-slate-600"
                    >{workspace.activeMatter?.case_number || "No Case #"}</span
                >
            </div>
            <h1 class="text-4xl font-black text-slate-800 tracking-tight">
                {workspace.activeMatter?.title}
            </h1>
        </div>
        <button
            onclick={() => workspace.openNewDocumentModal()}
            class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-wide text-xs shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 cursor-pointer"
        >
            <Icon name="Plus" size={16} /> New Document
        </button>
    </div>

    <!-- Content -->
    {#if workspace.documents.length === 0}
        <div
            class="text-center py-24 bg-slate-50 rounded-3xl border border-dashed border-slate-200"
        >
            <div
                class="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-200 shadow-sm"
            >
                <Icon name="FileText" size={40} />
            </div>
            <h3
                class="text-lg font-black text-slate-400 uppercase tracking-widest mb-2"
            >
                No Documents Found
            </h3>
            <p class="text-slate-400 text-sm mb-6">
                Create your first document to get started.
            </p>
            <button
                onclick={() => workspace.openNewDocumentModal()}
                class="text-indigo-600 font-bold text-sm hover:underline cursor-pointer"
            >
                Create Document Now
            </button>
        </div>
    {:else}
        <div
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
            {#each workspace.documents as document (document.id)}
                <button
                    onclick={() => editDocument(document.id)}
                    class="bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-xl hover:-translate-y-1 p-6 rounded-2xl cursor-pointer transition-all group h-48 flex flex-col justify-between relative overflow-hidden text-left"
                >
                    <div
                        class="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-slate-50 to-indigo-50/50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-700"
                    ></div>
                    <div class="relative z-10">
                        <div class="flex justify-between items-start mb-4">
                            <span
                                class="w-10 h-10 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors shadow-sm"
                            >
                                <Icon name="FileText" size={18} />
                            </span>
                        </div>
                        <h3
                            class="font-bold text-lg text-slate-800 mb-1 leading-snug group-hover:text-indigo-700 transition-colors line-clamp-2"
                        >
                            {document.title}
                        </h3>
                        <p class="text-xs text-slate-400 font-medium">
                            Last updated {new Date(
                                document.updated,
                            ).toLocaleDateString()}
                        </p>
                    </div>
                    <div
                        class="relative z-10 pt-4 mt-auto border-t border-slate-50 flex justify-between items-center"
                    >
                        <span
                            class="text-[10px] font-bold text-slate-300 group-hover:text-indigo-400 transition-colors uppercase tracking-wider"
                            >Edit Document →</span
                        >
                    </div>
                </button>
            {/each}
        </div>
    {/if}
</div>

<!-- Template Selection Modal -->
{#if workspace.isModalOpen}
    <div
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
    >
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in duration-200"
            onclick={(e) => e.stopPropagation()}
        >
            <!-- Header -->
            <div
                class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50"
            >
                <div>
                    <h3
                        class="text-lg font-black text-slate-700 uppercase tracking-wider"
                    >
                        New Document
                    </h3>
                    <p class="text-xs text-slate-400 font-bold mt-1">
                        Select a template to start with
                    </p>
                </div>
                <button
                    onclick={() => workspace.closeModal()}
                    class="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-200/50 rounded-lg cursor-pointer"
                >
                    <Icon name="X" size={20} />
                </button>
            </div>

            <!-- Search -->
            <div class="p-4 border-b border-slate-100 bg-white">
                <div class="relative">
                    <Icon
                        name="Search"
                        size={16}
                        class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                        type="text"
                        bind:value={workspace.searchTerm}
                        placeholder="Search templates..."
                        class="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                        autoFocus
                    />
                </div>
            </div>

            <!-- List -->
            <div class="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/30">
                {#if workspace.loadingTemplates}
                    <div
                        class="flex flex-col items-center justify-center py-12 text-slate-400"
                    >
                        <Icon
                            name="Loader2"
                            size={24}
                            class="animate-spin mb-3 text-indigo-400"
                        />
                        <span
                            class="text-xs font-bold uppercase tracking-widest"
                            >Loading Library...</span
                        >
                    </div>
                {:else if workspace.filteredTemplates.length === 0}
                    <div class="text-center py-12 text-slate-400">
                        <Icon
                            name="FileQuestion"
                            size={32}
                            class="mx-auto mb-3 opacity-50"
                        />
                        <span
                            class="text-xs font-bold uppercase tracking-widest"
                            >No templates found</span
                        >
                    </div>
                {:else}
                    {#each workspace.filteredTemplates as template}
                        <button
                            onclick={() => workspace.selectTemplate(template)}
                            class={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between group cursor-pointer ${workspace.selectedTemplate?.id === template.id ? "border-indigo-600 bg-indigo-50 shadow-md ring-1 ring-indigo-600 z-10" : "border-slate-200 hover:border-indigo-300 hover:bg-white hover:shadow-sm bg-white"}`}
                        >
                            <div>
                                <div
                                    class={`font-bold transition-colors ${workspace.selectedTemplate?.id === template.id ? "text-indigo-700" : "text-slate-700 group-hover:text-indigo-700"}`}
                                >
                                    {template.title}
                                </div>
                                {#if template.category}
                                    <div
                                        class="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-1 bg-slate-100 inline-block px-1.5 py-0.5 rounded"
                                    >
                                        {template.category}
                                    </div>
                                {/if}
                            </div>
                            {#if workspace.selectedTemplate?.id === template.id}
                                <div
                                    class="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg transform scale-110"
                                >
                                    <Icon
                                        name="Check"
                                        size={14}
                                        class="text-white"
                                    />
                                </div>
                            {/if}
                        </button>
                    {/each}
                {/if}
            </div>

            <!-- Footer -->
            <div
                class="p-5 border-t border-slate-100 bg-white flex justify-end gap-3 z-10"
            >
                <button
                    onclick={() => workspace.closeModal()}
                    class="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors text-xs uppercase tracking-wide cursor-pointer"
                >
                    Cancel
                </button>
                <button
                    onclick={() => workspace.createDocument()}
                    disabled={!workspace.selectedTemplate || workspace.creating}
                    class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 text-xs uppercase tracking-wide cursor-pointer"
                >
                    {#if workspace.creating}
                        <Icon name="Loader2" size={14} class="animate-spin" /> Creating...
                    {:else}
                        Create Document
                    {/if}
                </button>
            </div>
        </div>
    </div>
{/if}
