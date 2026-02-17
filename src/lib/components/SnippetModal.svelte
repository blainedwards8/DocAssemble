<script lang="ts">
    import { Snippet } from "$lib/models/snippets.svelte";
    import Icon from "./Icon.svelte";

    // Props: snippet (object for edit, null for create), slotName (initial slot), onClose, onSaved
    let { snippet = null, slotName = "", onClose, onSaved } = $props();

    // Local reactive state for form fields
    let title = $state(snippet ? snippet.title : "");
    let content = $state(snippet ? snippet.content : "");
    let tagsStr = $state(snippet ? (snippet.tags || []).join(", ") : "");
    let slotsStr = $state(
        snippet ? (snippet.slots || []).join(", ") : slotName,
    );

    let isSaving = $state(false);
    let isDeleting = $state(false);

    /**
     * Handles saving or updating the snippet
     */
    async function handleSave() {
        if (!title.trim() || !content.trim()) return;

        isSaving = true;
        const tags = tagsStr
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t !== "");
        const slots = slotsStr
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s !== "");

        try {
            if (snippet) {
                // Update existing
                snippet.title = title;
                snippet.content = content;
                snippet.tags = tags;
                snippet.slots = slots;
                await snippet.save();
            } else {
                // Create new
                await Snippet.create(title, content, tags, slots);
            }
            onSaved();
            onClose();
        } catch (e) {
            console.error("Save error:", e);
        } finally {
            isSaving = false;
        }
    }

    /**
     * Handles deleting the snippet
     */
    async function handleDelete() {
        if (
            !snippet ||
            !confirm("Are you sure you want to delete this snippet?")
        )
            return;

        isDeleting = true;
        try {
            await Snippet.delete(snippet.id);
            onSaved();
            onClose();
        } catch (e) {
            console.error("Delete error:", e);
        } finally {
            isDeleting = false;
        }
    }
</script>

<div
    class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
>
    <div
        class="bg-white w-full max-w-xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200"
    >
        <!-- Header -->
        <header
            class="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50"
        >
            <div class="flex items-center gap-3">
                <div class="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                    <Icon name={snippet ? "Edit3" : "Plus"} size={18} />
                </div>
                <div>
                    <h2
                        class="text-sm font-black text-slate-800 uppercase tracking-tight"
                    >
                        {snippet ? "Edit Snippet" : "Create New Snippet"}
                    </h2>
                    <p
                        class="text-[10px] text-slate-400 font-bold uppercase tracking-widest"
                    >
                        {snippet
                            ? "Update reusable provision"
                            : "Define a new reusable provision"}
                    </p>
                </div>
            </div>
            <button
                onclick={onClose}
                class="p-2 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors border-none cursor-pointer"
            >
                <Icon name="X" size={20} />
            </button>
        </header>

        <!-- Body -->
        <div
            class="p-6 space-y-4 overflow-y-auto max-h-[70vh] custom-scrollbar"
        >
            <!-- Title -->
            <div class="space-y-1">
                <label
                    class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1"
                    >Title</label
                >
                <input
                    bind:value={title}
                    placeholder="e.g., Standard Jurisdiction Clause"
                    class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-medium text-slate-700"
                />
            </div>

            <!-- Content -->
            <div class="space-y-1">
                <label
                    class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1"
                    >Content (Markdown)</label
                >
                <textarea
                    bind:value={content}
                    placeholder="Enter the provision text..."
                    rows="6"
                    class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-serif leading-relaxed text-slate-600 resize-none"
                ></textarea>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <!-- Tags -->
                <div class="space-y-1">
                    <label
                        class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1"
                        >Tags (comma separated)</label
                    >
                    <input
                        bind:value={tagsStr}
                        placeholder="civil, family, standard"
                        class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    />
                </div>
                <!-- Slots -->
                <div class="space-y-1">
                    <label
                        class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1"
                        >Associated Slots</label
                    >
                    <input
                        bind:value={slotsStr}
                        placeholder="Jurisdiction, Venue"
                        class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    />
                </div>
            </div>
        </div>

        <!-- Footer -->
        <footer
            class="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between"
        >
            <div>
                {#if snippet}
                    <button
                        onclick={handleDelete}
                        disabled={isDeleting}
                        class="px-4 py-2 text-rose-500 hover:bg-rose-50 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border-none cursor-pointer flex items-center gap-2"
                    >
                        {#if isDeleting}
                            <Icon
                                name="Loader2"
                                size={14}
                                class="animate-spin"
                            />
                        {:else}
                            <Icon name="Trash2" size={14} />
                        {/if}
                        Delete
                    </button>
                {/if}
            </div>

            <div class="flex items-center gap-3">
                <button
                    onclick={onClose}
                    class="px-4 py-2 text-slate-400 hover:text-slate-600 text-[10px] font-black uppercase tracking-widest transition-all border-none cursor-pointer"
                >
                    Cancel
                </button>
                <button
                    onclick={handleSave}
                    disabled={isSaving || !title.trim() || !content.trim()}
                    class="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all border-none cursor-pointer flex items-center gap-2"
                >
                    {#if isSaving}
                        <Icon name="Loader2" size={14} class="animate-spin" />
                    {:else}
                        <Icon name="Save" size={14} />
                    {/if}
                    {snippet ? "Update Snippet" : "Create Snippet"}
                </button>
            </div>
        </footer>
    </div>
</div>
