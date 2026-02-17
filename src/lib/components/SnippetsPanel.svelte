<script lang="ts">
    import { pb } from "$lib/pocketbase.svelte";
    import { Snippet } from "$lib/models/Snippet.svelte";
    import Icon from "./Icon.svelte";

    let { slotName, onInsert, onEdit, onClose } = $props();

    let snippets = $state([]);
    let isLoading = $state(false);
    let error = $state(null);
    let searchQuery = $state("");
    let showAll = $state(false);

    // Re-fetch snippets whenever slotName or the "Show All" toggle changes
    $effect(() => {
        loadSnippets();
    });

    /**
     * Loads snippets from PocketBase.
     * If 'showAll' is active, it fetches the entire library.
     * Otherwise, it filters by snippets associated with the current slotName.
     */
    async function loadSnippets() {
        isLoading = true;
        error = null;
        try {
            let filter = "";
            if (!showAll && slotName) {
                // PocketBase '~' operator for searching within the JSON/Array 'slots' field
                filter = `slots ~ "${slotName}"`;
            }

            const records = await pb.collection("snippets").getFullList({
                filter,
                sort: "-created",
            });

            snippets = records.map(
                (r) => new Snippet(r.id, r.title, r.content, r.tags, r.slots),
            );
        } catch (e) {
            console.error("Fetch snippets error:", e);
            error = "Failed to load library.";
        } finally {
            isLoading = false;
        }
    }

    // Client-side filtering based on the search query
    let filteredSnippets = $derived(
        snippets.filter(
            (s) =>
                s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (s.tags || []).some((t) =>
                    t.toLowerCase().includes(searchQuery.toLowerCase()),
                ),
        ),
    );
</script>

<div
    class="w-96 bg-white border-l border-slate-200 flex flex-col h-full shadow-2xl z-[60]"
>
    <header
        class="h-16 border-b border-slate-100 px-6 flex items-center justify-between shrink-0 bg-slate-50/50"
    >
        <div class="flex flex-col">
            <span
                class="text-[10px] font-black text-indigo-500 uppercase tracking-widest"
                >Discovery</span
            >
            <h2 class="text-xs font-bold text-slate-800 truncate w-48">
                {showAll ? "Global Library" : `Snippets for ${slotName}`}
            </h2>
        </div>
        <button
            onclick={onClose}
            class="p-2 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors border-none cursor-pointer"
        >
            <Icon name="X" size={18} />
        </button>
    </header>

    <!-- Search and Filter Controls -->
    <div class="p-4 border-b border-slate-100 space-y-3 bg-white">
        <div class="relative">
            <div
                class="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400"
            >
                <Icon name="Search" size={14} />
            </div>
            <input
                bind:value={searchQuery}
                placeholder="Search title, content, or tags..."
                class="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-medium text-slate-600"
            />
        </div>

        <div class="flex items-center justify-between px-1">
            <span
                class="text-[10px] font-black text-slate-400 uppercase tracking-tight"
                >Show all snippets</span
            >
            <button
                onclick={() => (showAll = !showAll)}
                class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none {showAll
                    ? 'bg-indigo-600'
                    : 'bg-slate-200'}"
            >
                <span
                    class="inline-block h-3 w-3 transform rounded-full bg-white transition-transform {showAll
                        ? 'translate-x-5'
                        : 'translate-x-1'}"
                ></span>
            </button>
        </div>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {#if isLoading}
            <div
                class="flex flex-col items-center justify-center py-20 text-slate-300"
            >
                <Icon name="Loader2" size={24} class="animate-spin mb-2" />
                <span class="text-[10px] font-black uppercase tracking-widest"
                    >Syncing Library...</span
                >
            </div>
        {:else if error}
            <div
                class="p-4 bg-rose-50 rounded-xl border border-rose-100 text-rose-600 text-[11px] font-medium"
            >
                {error}
            </div>
        {:else if filteredSnippets.length === 0}
            <div class="py-20 text-center px-6">
                <div
                    class="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100"
                >
                    <Icon
                        name="FileQuestion"
                        size={20}
                        class="text-slate-300"
                    />
                </div>
                <h3
                    class="text-xs font-bold text-slate-400 uppercase tracking-tight mb-2"
                >
                    No Matches Found
                </h3>
                <p class="text-[11px] text-slate-400 leading-relaxed">
                    {searchQuery
                        ? "Try adjusting your search query."
                        : `No snippets associated with "${slotName}".`}
                </p>
            </div>
        {:else}
            {#each filteredSnippets as snippet}
                <div class="relative group">
                    <button
                        onclick={() => onInsert(snippet.content)}
                        class="w-full text-left p-4 bg-white border border-slate-100 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
                    >
                        <div class="flex items-center justify-between mb-2">
                            <span
                                class="text-[9px] font-black text-slate-300 uppercase tracking-widest truncate w-40"
                            >
                                {snippet.title || "Untitled Snippet"}
                            </span>
                            <div class="flex items-center gap-2">
                                <button
                                    onclick={(e) => {
                                        e.stopPropagation();
                                        onEdit(snippet);
                                    }}
                                    class="p-1 hover:bg-slate-100 rounded text-slate-300 hover:text-indigo-500 transition-colors border-none cursor-pointer"
                                >
                                    <Icon name="Edit2" size={12} />
                                </button>
                                <Icon
                                    name="ArrowRight"
                                    size={10}
                                    class="text-slate-200 group-hover:text-indigo-400"
                                />
                            </div>
                        </div>
                        <p
                            class="text-[11px] text-slate-600 line-clamp-3 leading-relaxed font-serif"
                        >
                            {snippet.content}
                        </p>

                        {#if snippet.tags && snippet.tags.length > 0}
                            <div class="mt-3 flex flex-wrap gap-1">
                                {#each snippet.tags as tag}
                                    <span
                                        class="px-1.5 py-0.5 bg-slate-50 border border-slate-100 rounded text-[8px] font-bold text-slate-400 uppercase tracking-tighter"
                                        >{tag}</span
                                    >
                                {/each}
                            </div>
                        {/if}

                        <!-- Badge for slot matches when in 'Show All' mode -->
                        {#if showAll && slotName && (snippet.slots || []).includes(slotName)}
                            <div class="absolute top-0 right-0 p-1">
                                <div
                                    class="w-2 h-2 rounded-full bg-emerald-400 shadow-sm"
                                    title="Exact match for current slot"
                                ></div>
                            </div>
                        {/if}
                    </button>
                </div>
            {/each}
        {/if}
    </div>

    <footer class="p-4 border-t border-slate-100 bg-slate-50/30">
        <button
            onclick={() => onEdit(null)}
            class="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-indigo-300 hover:text-indigo-600 transition-all cursor-pointer flex items-center justify-center gap-2 group"
        >
            <Icon
                name="Plus"
                size={14}
                class="group-hover:scale-110 transition-transform"
            />
            New Library Snippet
        </button>
    </footer>
</div>
