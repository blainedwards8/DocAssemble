<script lang="ts">
    import { pb } from "$lib/pocketbase.svelte";
    import Icon from "./Icon.svelte";

    let { slotName, onSelect, onClose } = $props();

    let snippets = $state([]);
    let isLoading = $state(false);
    let error = $state(null);

    // Fetch snippets whenever the slotName changes
    $effect(() => {
        if (!slotName) return;

        const fetchSnippets = async () => {
            isLoading = true;
            error = null;
            try {
                // Using the updated 'snippets' collection.
                // Filter matches the slotName against the JSON 'slots' field.
                const records = await pb.collection("snippets").getFullList({
                    filter: `slots ~ "${slotName}"`,
                    sort: "-created",
                });
                snippets = records;
            } catch (e) {
                console.error("Fetch snippets error:", e);
                error = "Failed to load snippets.";
            } finally {
                isLoading = false;
            }
        };

        fetchSnippets();
    });
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
                >Snippets</span
            >
            <h2 class="text-xs font-bold text-slate-800 truncate w-48">
                {slotName}
            </h2>
        </div>
        <button
            onclick={onClose}
            class="p-2 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors border-none cursor-pointer"
        >
            <Icon name="X" size={18} />
        </button>
    </header>

    <div class="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {#if isLoading}
            <div
                class="flex flex-col items-center justify-center py-20 text-slate-300"
            >
                <Icon name="Loader2" size={24} class="animate-spin mb-2" />
                <span class="text-[10px] font-bold uppercase tracking-widest"
                    >Searching...</span
                >
            </div>
        {:else if error}
            <div
                class="p-4 bg-rose-50 rounded-xl border border-rose-100 text-rose-600 text-[11px] font-medium"
            >
                {error}
            </div>
        {:else if snippets.length === 0}
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
                    No Snippets Found
                </h3>
                <p class="text-[11px] text-slate-400 leading-relaxed">
                    No template snippets have been associated with "{slotName}"
                    yet.
                </p>
            </div>
        {:else}
            {#each snippets as snippet}
                <button
                    onclick={() => onSelect(snippet.content)}
                    class="w-full group text-left p-4 bg-white border border-slate-100 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
                >
                    <div class="flex items-center justify-between mb-2">
                        <span
                            class="text-[9px] font-black text-slate-300 uppercase tracking-widest"
                            >{snippet.title || "Untitled Snippet"}</span
                        >
                        <Icon
                            name="ArrowRight"
                            size={10}
                            class="text-slate-200 group-hover:text-indigo-400 transition-colors"
                        />
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
                                    class="px-1.5 py-0.5 bg-slate-50 border border-slate-100 rounded text-[8px] font-bold text-slate-400 uppercase"
                                    >{tag}</span
                                >
                            {/each}
                        </div>
                    {/if}
                    <div
                        class="absolute bottom-0 left-0 w-full h-1 bg-indigo-500 transform translate-y-full group-hover:translate-y-0 transition-transform"
                    ></div>
                </button>
            {/each}
        {/if}
    </div>

    <footer class="p-4 border-t border-slate-100 bg-slate-50/30">
        <button
            class="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:border-indigo-200 hover:text-indigo-400 transition-all cursor-pointer"
        >
            + Create New Snippet
        </button>
    </footer>
</div>
