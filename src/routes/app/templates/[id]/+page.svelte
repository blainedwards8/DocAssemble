<script lang="ts">
    import Icon from "$lib/components/Icon.svelte";
    import TreeItem from "$lib/components/TreeItem.svelte";
    import SnippetsPanel from "$lib/components/SnippetsPanel.svelte";

    let { data } = $props();
    const { template } = data;

    let editorRef: HTMLTextAreaElement | undefined = $state();
    let saveStatus = $state("idle");

    // Tracks which slot is currently being "searched" in the right panel
    let selectedSlotName = $state(null);

    // Tree structure derived from template content
    let tree = $derived(template.getTree());

    async function handleSave() {
        saveStatus = "saving";
        let results: boolean = await template.save();
        if (results) {
            saveStatus = "saved";
            setTimeout(() => {
                saveStatus = "idle";
            }, 3000);
        } else {
            saveStatus = "error";
        }
    }

    /**
     * Triggered when a slot is clicked in the Sidebar tree.
     */
    function handleSelectSlot(name: string) {
        selectedSlotName = name;
    }

    /**
     * Triggered when a snippet is chosen from the SnippetsPanel.
     */
    function handleSelectSnippet(content: string) {
        if (!selectedSlotName) return;

        // We wrap the snippet in the slot markers to maintain the template structure
        const textToInsert = `[[${selectedSlotName}]]\n${content}\n`;
        insertAtCursor(textToInsert);
    }

    function insertAtCursor(text: string) {
        if (!editorRef) return;
        const start = editorRef.selectionStart;
        const end = editorRef.selectionEnd;

        template.content =
            template.content.substring(0, start) +
            text +
            template.content.substring(end);

        setTimeout(() => {
            editorRef!.focus();
            const newPos = start + text.length;
            editorRef!.setSelectionRange(newPos, newPos);
        }, 0);
    }

    function handleKeyDown(e: KeyboardEvent) {
        if (e.key === "Tab") {
            e.preventDefault();
            insertAtCursor("    ");
        }
    }

    let autosaveTimer: any;
    $effect(() => {
        // Run autosave on content/title changes
        const _trigger = [template.content, template.title];
        if (autosaveTimer) clearTimeout(autosaveTimer);
        autosaveTimer = setTimeout(() => {
            if (saveStatus !== "saving") handleSave();
        }, 3000);
        return () => clearTimeout(autosaveTimer);
    });
</script>

<div class="h-screen flex flex-col bg-slate-50 overflow-hidden font-sans">
    <!-- Header -->
    <header
        class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-50"
    >
        <div class="flex items-center gap-4">
            <a
                href="/app/templates"
                class="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
            >
                <Icon name="ArrowLeft" size={20} />
            </a>
            <div class="h-8 w-px bg-slate-200"></div>
            <div class="flex flex-col">
                <input
                    bind:value={template.title}
                    class="text-sm font-black text-slate-800 bg-transparent border-none outline-none focus:ring-2 focus:ring-indigo-500/20 rounded px-2 py-1 w-64"
                    placeholder="Template Title..."
                />
                <p
                    class="text-[10px] text-slate-400 font-bold uppercase tracking-widest px-2"
                >
                    Blueprint Editor
                </p>
            </div>
        </div>

        <div class="flex items-center gap-4">
            <div
                class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200"
            >
                {#if saveStatus === "saving"}
                    <Icon
                        name="Loader2"
                        size={14}
                        class="text-indigo-500 animate-spin"
                    />
                    <span
                        class="text-[10px] font-black uppercase text-indigo-500 tracking-tighter"
                        >Syncing</span
                    >
                {:else if saveStatus === "saved"}
                    <Icon name="Check" size={14} class="text-emerald-500" />
                    <span
                        class="text-[10px] font-black uppercase text-emerald-500 tracking-tighter"
                        >Saved</span
                    >
                {:else if saveStatus === "error"}
                    <Icon name="AlertCircle" size={14} class="text-rose-500" />
                    <span
                        class="text-[10px] font-black uppercase text-rose-500 tracking-tighter"
                        >Error</span
                    >
                {:else}
                    <Icon name="Cloud" size={14} class="text-slate-300" />
                    <span
                        class="text-[10px] font-black uppercase text-slate-300 tracking-tighter"
                        >Ready</span
                    >
                {/if}
            </div>

            <button
                onclick={handleSave}
                class="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all border-none cursor-pointer"
            >
                Save
            </button>
        </div>
    </header>

    <div class="flex-1 flex overflow-hidden">
        <!-- Sidebar: Hierarchical Tree -->
        <aside
            class="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-hidden"
        >
            <div class="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                <div>
                    <h3
                        class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4"
                    >
                        Global Variables
                    </h3>
                    <div class="space-y-1">
                        {#each tree.globalVariables as v}
                            <button
                                onclick={() => insertAtCursor(`{${v}}`)}
                                class="w-full flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100 hover:border-indigo-300 transition-all text-left cursor-pointer group"
                            >
                                <Icon
                                    name="Globe"
                                    size={10}
                                    class="text-slate-300 group-hover:text-indigo-500"
                                />
                                <span
                                    class="text-[11px] font-mono font-medium text-slate-600 truncate"
                                    >{v}</span
                                >
                            </button>
                        {:else}
                            <p class="text-[10px] text-slate-300 italic px-2">
                                No variables detected
                            </p>
                        {/each}
                    </div>
                </div>

                <div>
                    <h3
                        class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4"
                    >
                        Document Structure
                    </h3>
                    <div class="space-y-2">
                        {#each tree.components as component}
                            <TreeItem
                                {component}
                                {insertAtCursor}
                                onSelectSlot={handleSelectSlot}
                            />
                        {/each}
                    </div>
                </div>
            </div>
        </aside>

        <!-- Main Editor -->
        <main class="flex-1 bg-white flex flex-col overflow-hidden relative">
            <div class="flex-1 flex overflow-hidden">
                <textarea
                    bind:this={editorRef}
                    bind:value={template.content}
                    onkeydown={handleKeyDown}
                    spellcheck="false"
                    placeholder="Start building your template..."
                    class="flex-1 w-full p-12 lg:p-16 font-mono text-sm leading-relaxed text-slate-700 bg-transparent border-none outline-none resize-none overflow-y-auto custom-scrollbar selection:bg-indigo-100 selection:text-indigo-900"
                ></textarea>
            </div>

            <footer
                class="h-10 bg-slate-50 border-t border-slate-200 px-6 flex items-center justify-between shrink-0"
            >
                <div class="flex items-center gap-6">
                    <span
                        class="text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                    >
                        Lines: {template.content.split("\n").length}
                    </span>
                    <span
                        class="text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                    >
                        Chars: {template.content.length}
                    </span>
                </div>
                <div class="flex items-center gap-2 text-slate-300">
                    <Icon name="Zap" size={12} />
                    <span
                        class="text-[10px] font-black uppercase tracking-tighter"
                        >Auto-sync active</span
                    >
                </div>
            </footer>
        </main>

        <!-- Right Side: Snippets Discovery -->
        {#if selectedSlotName}
            <div class="h-full border-l border-slate-200">
                <SnippetsPanel
                    slotName={selectedSlotName}
                    onSelect={handleSelectSnippet}
                    onClose={() => (selectedSlotName = null)}
                />
            </div>
        {/if}
    </div>
</div>

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
