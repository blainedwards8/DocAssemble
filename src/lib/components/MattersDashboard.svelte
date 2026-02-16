<script>
    import Icon from "$lib/components/Icon.svelte";
    import { pb } from "$lib/pocketbase";
    import { matters, activeMatter } from "$lib/stores/app";

    /** @type {{ onOpenDocument: (doc: any, mode: string) => void, onNewDocument: () => void, onCreateMatter: (matter: any) => void }} */
    let { onOpenDocument, onNewDocument, onCreateMatter } = $props();

    let documents = $state([]);
    let isLoadingDocs = $state(false);
    let isCreatingMatter = $state(false);
    let newMatterName = $state("");
    let newMatterClient = $state("");

    $effect(() => {
        if ($activeMatter) {
            fetchDocuments($activeMatter.id);
        } else {
            documents = [];
        }
    });

    /** @param {string} matterId */
    async function fetchDocuments(matterId) {
        isLoadingDocs = true;
        try {
            const records = await pb.collection("documents").getList(1, 50, {
                filter: `matter = "${matterId}"`,
                sort: "-created",
            });
            documents = records.items;
        } catch (err) {
            console.error("Error fetching documents:", err);
        } finally {
            isLoadingDocs = false;
        }
    }

    /** @param {SubmitEvent} e */
    function handleCreateMatter(e) {
        e.preventDefault();
        onCreateMatter({
            title: newMatterName,
            client: newMatterClient,
            case_number: newMatterClient,
        });
        isCreatingMatter = false;
        newMatterName = "";
        newMatterClient = "";
    }

    /** @param {any} matter */
    function selectMatter(matter) {
        activeMatter.set(matter);
    }
</script>

{#if $activeMatter}
    <div class="flex-1 flex flex-col bg-slate-50 overflow-hidden">
        <!-- Matter Toolbar -->
        <div
            class="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-10 flex justify-between items-center"
        >
            <div class="flex items-center gap-6">
                <button
                    onclick={() => selectMatter(null)}
                    class="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all border-none bg-transparent cursor-pointer"
                    title="Back to Matters"
                >
                    <Icon name="ArrowLeft" size={20} />
                </button>
                <div class="h-8 w-px bg-slate-100"></div>
                <div>
                    <h1
                        class="text-xl font-black text-slate-800 tracking-tight leading-none mb-1"
                    >
                        {$activeMatter?.title || "Unknown Matter"}
                    </h1>
                    <p
                        class="text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                    >
                        {$activeMatter?.client ||
                            $activeMatter?.case_number ||
                            "No Client"}
                    </p>
                </div>
            </div>
            <button
                onclick={onNewDocument}
                class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all flex items-center gap-2 border-none cursor-pointer"
            >
                <Icon name="Plus" size={14} /> New Document
            </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <!-- Documents Grid -->
            {#if isLoadingDocs}
                <div
                    class="flex bg-white rounded-xl p-8 items-center justify-center gap-2 text-sm text-slate-400 font-medium border border-slate-100 shadow-sm animate-pulse"
                >
                    <Icon name="Loader2" class="animate-spin" /> Loading Documents...
                </div>
            {:else if documents.length === 0}
                <div
                    class="text-center py-20 bg-white rounded-xl border border-dashed border-slate-200"
                >
                    <div
                        class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300"
                    >
                        <Icon name="FileText" size={32} />
                    </div>
                    <h3
                        class="text-sm font-black uppercase tracking-widest text-slate-400"
                    >
                        No Documents Yet
                    </h3>
                    <button
                        onclick={onNewDocument}
                        class="mt-4 text-indigo-600 hover:text-indigo-700 text-xs font-bold underline bg-transparent border-none cursor-pointer"
                        >Create your first document</button
                    >
                </div>
            {:else}
                <div
                    class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                >
                    {#each documents as doc (doc.id)}
                        <div
                            role="button"
                            tabindex="0"
                            class="group relative bg-white border border-slate-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-48 text-left"
                            onclick={() => onOpenDocument(doc, "edit")}
                            onkeydown={(e) =>
                                e.key === "Enter" &&
                                onOpenDocument(doc, "edit")}
                        >
                            <div
                                class="flex items-start justify-between w-full"
                            >
                                <div
                                    class="p-3 bg-indigo-50 text-indigo-600 rounded-lg"
                                >
                                    <Icon name="FileText" size={20} />
                                </div>
                                <div
                                    class="opacity-0 group-hover:opacity-100 transition-all flex gap-1"
                                >
                                    <button
                                        title="Copy Text"
                                        onclick={(e) => {
                                            e.stopPropagation();
                                            onOpenDocument(doc, "copy");
                                        }}
                                        class="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-white rounded-lg border border-transparent hover:border-slate-100 shadow-sm transition-all cursor-pointer"
                                    >
                                        <Icon name="Copy" size={14} />
                                    </button>
                                    <button
                                        title="Export PDF"
                                        onclick={(e) => {
                                            e.stopPropagation();
                                            onOpenDocument(doc, "pdf");
                                        }}
                                        class="p-1.5 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-white rounded-lg border border-transparent hover:border-slate-100 shadow-sm transition-all cursor-pointer"
                                    >
                                        <Icon name="File" size={14} />
                                    </button>
                                    <button
                                        title="Export DOCX"
                                        onclick={(e) => {
                                            e.stopPropagation();
                                            onOpenDocument(doc, "docx");
                                        }}
                                        class="p-1.5 text-slate-400 hover:text-blue-500 bg-slate-50 hover:bg-white rounded-lg border border-transparent hover:border-slate-100 shadow-sm transition-all cursor-pointer"
                                    >
                                        <Icon name="FileText" size={14} />
                                    </button>
                                </div>
                            </div>
                            <div>
                                <h3
                                    class="font-bold text-slate-800 text-sm mb-1 line-clamp-2 leading-relaxed"
                                >
                                    {doc.title || "Untitled Document"}
                                </h3>
                                <p
                                    class="text-[10px] font-bold text-slate-400 uppercase tracking-wide"
                                >
                                    Last Edited {new Date(
                                        doc.updated,
                                    ).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    </div>
{:else}
    <div class="flex-1 flex flex-col bg-slate-50 overflow-hidden">
        <!-- Matters Toolbar -->
        <div
            class="bg-white border-b border-slate-200 px-10 py-6 sticky top-0 z-10 flex justify-between items-center"
        >
            <div>
                <h2
                    class="text-xs font-black text-slate-400 uppercase tracking-[0.2em]"
                >
                    General Matters
                </h2>
            </div>
            <button
                onclick={() => (isCreatingMatter = true)}
                class="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all flex items-center gap-2 border-none cursor-pointer"
            >
                <Icon name="Plus" size={16} /> New Matter
            </button>
        </div>

        <!-- List -->
        <div class="flex-1 overflow-y-auto p-10 custom-scrollbar">
            {#if isCreatingMatter}
                <div
                    class="mb-8 bg-white p-6 rounded-2xl border border-indigo-100 shadow-lg animate-in slide-in-from-top-4"
                >
                    <form
                        onsubmit={handleCreateMatter}
                        class="flex gap-4 items-end"
                    >
                        <div class="flex-1 space-y-2">
                            <label
                                for="matter-name"
                                class="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1"
                                >Matter Name</label
                            >
                            <input
                                id="matter-name"
                                type="text"
                                bind:value={newMatterName}
                                class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-300"
                                placeholder="e.g. Smith Divorce"
                                required
                            />
                        </div>
                        <div class="flex-1 space-y-2">
                            <label
                                for="matter-client"
                                class="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1"
                                >Case Number / Client</label
                            >
                            <input
                                id="matter-client"
                                type="text"
                                bind:value={newMatterClient}
                                class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-300"
                                placeholder="e.g. 2023-CV-12345"
                            />
                        </div>
                        <div class="flex gap-2">
                            <button
                                type="button"
                                onclick={() => (isCreatingMatter = false)}
                                class="px-5 py-3 text-slate-400 hover:text-slate-600 font-bold bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs uppercase tracking-wide transition-all border-none cursor-pointer"
                                >Cancel</button
                            >
                            <button
                                type="submit"
                                class="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:shadow-lg transition-all border-none cursor-pointer"
                                >Create Matter</button
                            >
                        </div>
                    </form>
                </div>
            {/if}

            {#if $matters.length === 0}
                <div class="text-center py-24">
                    <div
                        class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300"
                    >
                        <Icon name="Briefcase" size={40} />
                    </div>
                    <h3
                        class="text-lg font-black text-slate-400 uppercase tracking-widest mb-2"
                    >
                        No Matters Found
                    </h3>
                    <p class="text-slate-400 text-sm">
                        Create your first matter to get started.
                    </p>
                </div>
            {:else}
                <div
                    class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                >
                    {#each $matters as matter (matter.id)}
                        <button
                            onclick={() => selectMatter(matter)}
                            class="bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-xl hover:-translate-y-1 p-6 rounded-2xl cursor-pointer transition-all group h-48 flex flex-col justify-between relative overflow-hidden text-left bg-transparent"
                        >
                            <div
                                class="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-slate-50 to-indigo-50/50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-700"
                            ></div>
                            <div class="relative z-10">
                                <div
                                    class="flex justify-between items-start mb-4"
                                >
                                    <span
                                        class="w-10 h-10 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors shadow-sm"
                                    >
                                        <Icon name="Briefcase" size={18} />
                                    </span>
                                </div>
                                <h3
                                    class="font-bold text-lg text-slate-800 mb-1 leading-snug group-hover:text-indigo-700 transition-colors uppercase"
                                >
                                    {matter.title}
                                </h3>
                                <p
                                    class="text-xs font-bold text-slate-400 uppercase tracking-wider"
                                >
                                    {matter.client ||
                                        matter.case_number ||
                                        "No Client"}
                                </p>
                            </div>
                            <div
                                class="relative z-10 pt-4 mt-auto border-t border-slate-50 flex justify-between items-center"
                            >
                                <span
                                    class="text-[10px] font-bold text-slate-300 group-hover:text-indigo-400 transition-colors"
                                    >View Documents →</span
                                >
                            </div>
                        </button>
                    {/each}
                </div>
            {/if}
        </div>
    </div>
{/if}
