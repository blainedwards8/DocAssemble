<script>
    import Icon from "$lib/components/Icon.svelte";

    let { isOpen = $bindable(false), provision, onSave } = $props();

    let editingProvision = $state({ ...provision });

    $effect(() => {
        if (isOpen && provision) {
            editingProvision = { ...provision };
        }
    });

    /** @param {Event} e */
    function handleSubmit(e) {
        e.preventDefault();
        onSave(editingProvision);
        isOpen = false;
    }
</script>

{#if isOpen}
    <div
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-6 animate-in fade-in duration-200"
    >
        <form
            onsubmit={handleSubmit}
            class="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        >
            <header
                class="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/30"
            >
                <div>
                    <h2
                        class="text-lg font-black text-slate-800 tracking-tight uppercase"
                    >
                        {editingProvision.id
                            ? "Edit Provision"
                            : "New Provision"}
                    </h2>
                    <p
                        class="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-1"
                    >
                        Drafting Component
                    </p>
                </div>
                <button
                    type="button"
                    onclick={() => (isOpen = false)}
                    class="p-2 hover:bg-slate-200/50 rounded-xl transition-all border-none bg-transparent cursor-pointer"
                >
                    <Icon name="X" />
                </button>
            </header>
            <div class="p-8 space-y-6">
                <!-- Category & Title Row -->
                <div class="grid grid-cols-3 gap-6">
                    <div>
                        <label
                            for="prov-category"
                            class="text-[10px] font-black uppercase tracking-widest text-slate-400"
                            >Category</label
                        >
                        <input
                            id="prov-category"
                            type="text"
                            required
                            bind:value={editingProvision.category}
                            class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                            placeholder="e.g. Recitals"
                        />
                    </div>
                    <div class="col-span-2">
                        <label
                            for="prov-title"
                            class="text-[10px] font-black uppercase tracking-widest text-slate-400"
                            >Title</label
                        >
                        <input
                            id="prov-title"
                            type="text"
                            required
                            bind:value={editingProvision.title}
                            class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                            placeholder="e.g. Standard Confidentiality Clause"
                        />
                    </div>
                </div>

                <!-- Content Editor -->
                <div>
                    <label
                        for="prov-content"
                        class="text-[10px] font-black uppercase tracking-widest text-slate-400"
                        >Content</label
                    >
                    <textarea
                        id="prov-content"
                        required
                        rows="8"
                        bind:value={editingProvision.content}
                        class="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
                    ></textarea>
                </div>
            </div>
            <footer
                class="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3"
            >
                <button
                    type="button"
                    onclick={() => (isOpen = false)}
                    class="px-6 py-2.5 text-slate-400 font-bold hover:text-slate-600 transition-colors border-none bg-transparent cursor-pointer uppercase text-xs"
                    >Cancel</button
                >
                <button
                    type="submit"
                    class="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all border-none cursor-pointer"
                >
                    {editingProvision.id ? "Update" : "Create"}
                </button>
            </footer>
        </form>
    </div>
{/if}
