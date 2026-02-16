<script>
    import Icon from "$lib/components/Icon.svelte";
    import { structures } from "$lib/stores/app";

    /** @type {{ isOpen: boolean, onClose: () => void, onSelect: (structure: any) => void }} */
    let { isOpen, onClose, onSelect } = $props();

    let searchTerm = $state("");

    let filteredStructures = $derived(
        $structures.filter((s) =>
            s.title.toLowerCase().includes(searchTerm.toLowerCase()),
        ),
    );
</script>

{#if isOpen}
    <div
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100]"
    >
        <div
            class="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200"
        >
            <!-- Header -->
            <div
                class="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30"
            >
                <div>
                    <h3
                        class="font-black text-slate-800 uppercase tracking-widest text-sm mb-1"
                    >
                        Select Template
                    </h3>
                    <p
                        class="text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                    >
                        Choose a blueprint to start your new document
                    </p>
                </div>
                <button
                    onclick={onClose}
                    class="p-2 hover:bg-slate-100 rounded-xl transition-all border-none bg-transparent cursor-pointer text-slate-400 hover:text-slate-600"
                >
                    <Icon name="X" size={20} />
                </button>
            </div>

            <!-- Search -->
            <div class="px-8 py-4 border-b border-slate-50">
                <div class="relative">
                    <Icon
                        name="Search"
                        size={16}
                        class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                        type="text"
                        bind:value={searchTerm}
                        placeholder="Search templates..."
                        class="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                    />
                </div>
            </div>

            <!-- Grid -->
            <div class="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {#if filteredStructures.length === 0}
                    <div class="text-center py-12">
                        <Icon
                            name="FileText"
                            size={48}
                            class="mx-auto text-slate-200 mb-4"
                        />
                        <p
                            class="text-slate-400 font-bold uppercase tracking-widest text-xs"
                        >
                            No templates found
                        </p>
                    </div>
                {:else}
                    <div
                        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                    >
                        {#each filteredStructures as structure}
                            <button
                                onclick={() => onSelect(structure)}
                                class="bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-lg p-5 rounded-2xl cursor-pointer transition-all text-left group flex flex-col justify-between h-36 relative overflow-hidden"
                            >
                                <div class="relative z-10">
                                    <h4
                                        class="font-bold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors uppercase text-sm line-clamp-2"
                                    >
                                        {structure.title}
                                    </h4>
                                    <div class="flex items-center gap-2 mt-2">
                                        <span
                                            class="px-2 py-0.5 bg-slate-50 text-[8px] font-black text-slate-400 uppercase tracking-widest rounded border border-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-500 group-hover:border-indigo-100 transition-colors"
                                        >
                                            {structure.tag || "Blueprint"}
                                        </span>
                                    </div>
                                </div>
                                <div
                                    class="relative z-10 mt-auto flex items-center justify-between text-[10px] font-black text-slate-300 uppercase tracking-widest"
                                >
                                    <span>Select Template →</span>
                                </div>
                                <div
                                    class="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity"
                                >
                                    <Icon name="FileText" size={80} />
                                </div>
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}

<style>
    .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #e2e8f0;
        border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #cbd5e1;
    }
</style>
